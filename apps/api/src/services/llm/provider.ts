// ==============================================
// PLUGSPACE.IO TITAN v1.4 - LLM PROVIDER SERVICE
// ==============================================
// Unified interface for Claude and Gemini AI models
// with streaming, token counting, cost tracking,
// retry logic, and fallback mechanisms
// ==============================================

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI, GenerativeModel, Part } from '@google/generative-ai';
import { EventEmitter } from 'events';
import { Redis } from 'ioredis';
import { logger } from '../../lib/logger';
import { AppError, ErrorCodes, ExternalServiceError, AIError } from '@plugspace/utils';

// ============ TYPES ============

export type LLMProvider = 'claude' | 'gemini';
export type LLMModel = 
  | 'claude-sonnet-4-20250514'
  | 'claude-3-5-sonnet-20241022'
  | 'gemini-2.0-flash-exp'
  | 'gemini-1.5-pro-latest';

export interface LLMConfig {
  provider: LLMProvider;
  model: LLMModel;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  systemPrompt?: string;
}

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | LLMContent[];
}

export interface LLMContent {
  type: 'text' | 'image';
  text?: string;
  imageUrl?: string;
  imageBase64?: string;
  mimeType?: string;
}

export interface LLMResponse {
  id: string;
  provider: LLMProvider;
  model: LLMModel;
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cost: number;
  latencyMs: number;
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
  metadata?: Record<string, unknown>;
}

export interface StreamChunk {
  type: 'text' | 'usage' | 'done' | 'error';
  content?: string;
  usage?: LLMResponse['usage'];
  error?: string;
}

export interface LLMOptions {
  stream?: boolean;
  cache?: boolean;
  cacheTTL?: number;
  retries?: number;
  timeout?: number;
  fallbackModel?: LLMModel;
  organizationId?: string;
  userId?: string;
  projectId?: string;
  requestId?: string;
}

// ============ COST CONFIGURATION ============

const PRICING: Record<LLMModel, { inputPer1k: number; outputPer1k: number }> = {
  'claude-sonnet-4-20250514': { inputPer1k: 0.003, outputPer1k: 0.015 },
  'claude-3-5-sonnet-20241022': { inputPer1k: 0.003, outputPer1k: 0.015 },
  'gemini-2.0-flash-exp': { inputPer1k: 0.00035, outputPer1k: 0.00105 },
  'gemini-1.5-pro-latest': { inputPer1k: 0.00125, outputPer1k: 0.005 },
};

// ============ LLM PROVIDER CLASS ============

export class LLMService extends EventEmitter {
  private claude: Anthropic;
  private gemini: GoogleGenerativeAI;
  private redis: Redis;
  private defaultConfig: Partial<LLMConfig>;

  constructor(redis: Redis, config?: Partial<LLMConfig>) {
    super();
    
    this.claude = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    this.gemini = new GoogleGenerativeAI(
      process.env.GOOGLE_AI_API_KEY || ''
    );

    this.redis = redis;
    this.defaultConfig = {
      temperature: 0.3,
      maxTokens: 4096,
      ...config,
    };
  }

  // ============ MAIN COMPLETION METHOD ============

  async complete(
    config: LLMConfig,
    messages: LLMMessage[],
    options: LLMOptions = {}
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    const requestId = options.requestId || this.generateRequestId();

    const mergedConfig = { ...this.defaultConfig, ...config };

    logger.info('LLM request started', {
      requestId,
      provider: config.provider,
      model: config.model,
      messageCount: messages.length,
    });

    try {
      // Check cache first
      if (options.cache) {
        const cached = await this.getCachedResponse(config, messages);
        if (cached) {
          logger.info('LLM cache hit', { requestId });
          return { ...cached, latencyMs: Date.now() - startTime };
        }
      }

      // Execute request with retry logic
      const response = await this.executeWithRetry(
        () => this.executeRequest(mergedConfig, messages, options),
        options.retries || 3,
        requestId
      );

      // Calculate cost
      response.cost = this.calculateCost(config.model, response.usage);
      response.latencyMs = Date.now() - startTime;

      // Cache successful response
      if (options.cache) {
        await this.cacheResponse(config, messages, response, options.cacheTTL);
      }

      // Log interaction
      await this.logInteraction(config, messages, response, options);

      logger.info('LLM request completed', {
        requestId,
        latencyMs: response.latencyMs,
        tokens: response.usage.totalTokens,
        cost: response.cost,
      });

      return response;

    } catch (error) {
      logger.error('LLM request failed', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Try fallback model
      if (options.fallbackModel && options.fallbackModel !== config.model) {
        logger.warn('Attempting fallback model', {
          requestId,
          fallbackModel: options.fallbackModel,
        });
        
        return this.complete(
          { ...config, model: options.fallbackModel },
          messages,
          { ...options, fallbackModel: undefined }
        );
      }

      throw this.normalizeError(error, config);
    }
  }

  // ============ STREAMING COMPLETION ============

  async *stream(
    config: LLMConfig,
    messages: LLMMessage[],
    options: LLMOptions = {}
  ): AsyncGenerator<StreamChunk> {
    const startTime = Date.now();
    const requestId = options.requestId || this.generateRequestId();
    const mergedConfig = { ...this.defaultConfig, ...config };

    logger.info('LLM stream started', {
      requestId,
      provider: config.provider,
      model: config.model,
    });

    try {
      if (config.provider === 'claude') {
        yield* this.streamClaude(mergedConfig, messages, requestId);
      } else {
        yield* this.streamGemini(mergedConfig, messages, requestId);
      }

      yield {
        type: 'done',
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      };

    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Stream failed',
      };
    }
  }

  // ============ CLAUDE IMPLEMENTATION ============

  private async executeClaudeRequest(
    config: LLMConfig,
    messages: LLMMessage[]
  ): Promise<LLMResponse> {
    const anthropicMessages = this.convertToClaudeMessages(messages);
    const systemMessage = messages.find(m => m.role === 'system');

    const response = await this.claude.messages.create({
      model: config.model,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature,
      top_p: config.topP,
      stop_sequences: config.stopSequences,
      system: config.systemPrompt || (systemMessage?.content as string),
      messages: anthropicMessages,
    });

    const textContent = response.content.find(c => c.type === 'text');

    return {
      id: response.id,
      provider: 'claude',
      model: config.model,
      content: textContent?.type === 'text' ? textContent.text : '',
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      cost: 0,
      latencyMs: 0,
      finishReason: response.stop_reason === 'end_turn' ? 'stop' : 'length',
    };
  }

  private async *streamClaude(
    config: LLMConfig,
    messages: LLMMessage[],
    requestId: string
  ): AsyncGenerator<StreamChunk> {
    const anthropicMessages = this.convertToClaudeMessages(messages);
    const systemMessage = messages.find(m => m.role === 'system');

    const stream = await this.claude.messages.stream({
      model: config.model,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature,
      system: config.systemPrompt || (systemMessage?.content as string),
      messages: anthropicMessages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          yield { type: 'text', content: event.delta.text };
        }
      } else if (event.type === 'message_delta') {
        if (event.usage) {
          yield {
            type: 'usage',
            usage: {
              inputTokens: 0,
              outputTokens: event.usage.output_tokens,
              totalTokens: event.usage.output_tokens,
            },
          };
        }
      }
    }
  }

  private convertToClaudeMessages(
    messages: LLMMessage[]
  ): Anthropic.MessageParam[] {
    return messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: this.convertContent(m.content, 'claude'),
      }));
  }

  // ============ GEMINI IMPLEMENTATION ============

  private async executeGeminiRequest(
    config: LLMConfig,
    messages: LLMMessage[]
  ): Promise<LLMResponse> {
    const model = this.gemini.getGenerativeModel({
      model: config.model,
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
        topP: config.topP,
        topK: config.topK,
        stopSequences: config.stopSequences,
      },
    });

    const chat = model.startChat({
      history: this.convertToGeminiHistory(messages),
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
      },
    });

    const lastMessage = messages[messages.length - 1];
    const parts = this.convertToGeminiParts(lastMessage.content);

    const result = await chat.sendMessage(parts);
    const response = result.response;

    const usage = {
      inputTokens: response.usageMetadata?.promptTokenCount || 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: response.usageMetadata?.totalTokenCount || 0,
    };

    return {
      id: `gemini-${Date.now()}`,
      provider: 'gemini',
      model: config.model,
      content: response.text(),
      usage,
      cost: 0,
      latencyMs: 0,
      finishReason: 'stop',
    };
  }

  private async *streamGemini(
    config: LLMConfig,
    messages: LLMMessage[],
    requestId: string
  ): AsyncGenerator<StreamChunk> {
    const model = this.gemini.getGenerativeModel({
      model: config.model,
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
      },
    });

    const chat = model.startChat({
      history: this.convertToGeminiHistory(messages.slice(0, -1)),
    });

    const lastMessage = messages[messages.length - 1];
    const parts = this.convertToGeminiParts(lastMessage.content);

    const result = await chat.sendMessageStream(parts);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield { type: 'text', content: text };
      }
    }
  }

  private convertToGeminiHistory(messages: LLMMessage[]) {
    return messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: this.convertToGeminiParts(m.content),
      }));
  }

  private convertToGeminiParts(content: string | LLMContent[]): Part[] {
    if (typeof content === 'string') {
      return [{ text: content }];
    }

    return content.map(c => {
      if (c.type === 'text') {
        return { text: c.text || '' };
      } else if (c.type === 'image') {
        return {
          inlineData: {
            data: c.imageBase64 || '',
            mimeType: c.mimeType || 'image/jpeg',
          },
        };
      }
      return { text: '' };
    });
  }

  // ============ UTILITY METHODS ============

  private async executeRequest(
    config: LLMConfig,
    messages: LLMMessage[],
    options: LLMOptions
  ): Promise<LLMResponse> {
    if (config.provider === 'claude') {
      return this.executeClaudeRequest(config, messages);
    } else {
      return this.executeGeminiRequest(config, messages);
    }
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number,
    requestId: string
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (!this.isRetryableError(error)) {
          throw error;
        }

        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        logger.warn('LLM request retry', {
          requestId,
          attempt: attempt + 1,
          maxRetries,
          delay,
          error: lastError.message,
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('rate limit') ||
        message.includes('timeout') ||
        message.includes('connection') ||
        message.includes('503') ||
        message.includes('529')
      );
    }
    return false;
  }

  private convertContent(
    content: string | LLMContent[],
    provider: LLMProvider
  ): string | Anthropic.ContentBlockParam[] {
    if (typeof content === 'string') {
      return content;
    }

    if (provider === 'claude') {
      return content.map(c => {
        if (c.type === 'text') {
          return { type: 'text' as const, text: c.text || '' };
        } else {
          return {
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: (c.mimeType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: c.imageBase64 || '',
            },
          };
        }
      });
    }

    return content.map(c => c.text || '').join('\n');
  }

  // ============ COST CALCULATION ============

  calculateCost(model: LLMModel, usage: LLMResponse['usage']): number {
    const pricing = PRICING[model];
    if (!pricing) return 0;

    const inputCost = (usage.inputTokens / 1000) * pricing.inputPer1k;
    const outputCost = (usage.outputTokens / 1000) * pricing.outputPer1k;
    
    return Math.round((inputCost + outputCost) * 10000) / 10000;
  }

  // ============ CACHING ============

  private getCacheKey(config: LLMConfig, messages: LLMMessage[]): string {
    const hash = require('crypto')
      .createHash('sha256')
      .update(JSON.stringify({ config, messages }))
      .digest('hex')
      .slice(0, 16);
    return `llm:cache:${config.model}:${hash}`;
  }

  private async getCachedResponse(
    config: LLMConfig,
    messages: LLMMessage[]
  ): Promise<LLMResponse | null> {
    const key = this.getCacheKey(config, messages);
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  private async cacheResponse(
    config: LLMConfig,
    messages: LLMMessage[],
    response: LLMResponse,
    ttl: number = 86400
  ): Promise<void> {
    const key = this.getCacheKey(config, messages);
    await this.redis.setex(key, ttl, JSON.stringify(response));
  }

  // ============ LOGGING ============

  private async logInteraction(
    config: LLMConfig,
    messages: LLMMessage[],
    response: LLMResponse,
    options: LLMOptions
  ): Promise<void> {
    const logData = {
      provider: config.provider,
      model: config.model,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      cost: response.cost,
      latencyMs: response.latencyMs,
      organizationId: options.organizationId,
      userId: options.userId,
      projectId: options.projectId,
    };

    // Store in Redis for real-time analytics
    await this.redis.lpush(
      `llm:interactions:${options.organizationId || 'global'}`,
      JSON.stringify({ ...logData, timestamp: new Date().toISOString() })
    );

    // Trim to keep only recent interactions
    await this.redis.ltrim(
      `llm:interactions:${options.organizationId || 'global'}`,
      0,
      9999
    );

    logger.logAIInteraction({
      agentName: 'LLMService',
      model: config.model,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      latencyMs: response.latencyMs,
      cost: response.cost,
      success: true,
      userId: options.userId,
      projectId: options.projectId,
    });
  }

  // ============ ERROR HANDLING ============

  private normalizeError(error: unknown, config: LLMConfig): AppError {
    if (error instanceof AppError) return error;

    const message = error instanceof Error ? error.message : 'Unknown LLM error';

    if (message.includes('rate limit')) {
      return new AIError(
        ErrorCodes.RATE_LIMITED,
        'AI service rate limit exceeded. Please try again later.',
        config.provider,
        config.model
      );
    }

    if (message.includes('context length') || message.includes('token')) {
      return new AIError(
        ErrorCodes.CONTEXT_TOO_LONG,
        'Input is too long. Please reduce the content size.',
        config.provider,
        config.model
      );
    }

    if (message.includes('content') || message.includes('filter')) {
      return new AIError(
        ErrorCodes.CONTENT_FILTERED,
        'Content was filtered by the AI safety system.',
        config.provider,
        config.model
      );
    }

    return new AIError(
      ErrorCodes.AI_ERROR,
      `AI service error: ${message}`,
      config.provider,
      config.model
    );
  }

  private generateRequestId(): string {
    return `llm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  // ============ TOKEN COUNTING ============

  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  estimateMessageTokens(messages: LLMMessage[]): number {
    return messages.reduce((total, msg) => {
      if (typeof msg.content === 'string') {
        return total + this.estimateTokens(msg.content);
      }
      return total + msg.content.reduce((sum, c) => {
        if (c.type === 'text') return sum + this.estimateTokens(c.text || '');
        if (c.type === 'image') return sum + 1000; // Images ~1000 tokens
        return sum;
      }, 0);
    }, 0);
  }
}

// ============ SINGLETON EXPORT ============

let llmServiceInstance: LLMService | null = null;

export function getLLMService(redis: Redis): LLMService {
  if (!llmServiceInstance) {
    llmServiceInstance = new LLMService(redis);
  }
  return llmServiceInstance;
}

export default LLMService;
