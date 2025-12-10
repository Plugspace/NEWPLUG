// ==============================================
// PLUGSPACE.IO TITAN v1.4 - GEMINI LIVE SESSION
// ==============================================
// Bidirectional streaming with Google Gemini Live API
// for real-time voice conversations
// ==============================================

import { EventEmitter } from 'events';
import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';
import { logger } from './logger';

// ============ TYPES ============

export interface GeminiSessionConfig {
  sessionId: string;
  language: string;
  audioConfig: AudioConfig;
  features: SessionFeatures;
}

export interface AudioConfig {
  inputFormat: string;
  outputFormat: string;
  sampleRate: number;
  channels: number;
  bitrate: number;
}

export interface SessionFeatures {
  transcription: boolean;
  translation: boolean;
  sentimentAnalysis: boolean;
  intentDetection: boolean;
  voiceCloning: boolean;
}

export interface Transcript {
  text: string;
  isFinal: boolean;
  confidence: number;
  language: string;
  startTime: number;
  endTime: number;
  words?: Word[];
}

export interface Word {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface GeminiResponse {
  text: string;
  intent?: string;
  entities?: Entity[];
  emotion?: string;
  confidence: number;
  audioUrl?: string;
}

export interface Entity {
  type: string;
  value: string;
  confidence: number;
  start: number;
  end: number;
}

// ============ GEMINI LIVE SESSION ============

export class GeminiLiveSession extends EventEmitter {
  private config: GeminiSessionConfig;
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private chat: ChatSession | null = null;
  private isStreaming: boolean = false;
  private audioBuffer: Buffer[] = [];
  private transcriptBuffer: string = '';
  private lastActivity: Date = new Date();
  
  // System prompt for voice assistant
  private readonly SYSTEM_PROMPT = `You are Zara, a friendly and professional AI assistant for Plugspace.io, a voice-first website builder platform.

Your responsibilities:
1. Understand user requests for building and modifying websites
2. Translate natural language into actionable commands
3. Provide helpful feedback and suggestions
4. Guide users through the website creation process
5. Answer questions about features and capabilities

Personality:
- Warm and encouraging
- Professional but approachable
- Clear and concise in responses
- Patient with clarifications
- Enthusiastic about helping create great websites

When responding:
- Keep responses concise (1-2 sentences for simple queries)
- Be specific about what actions will be taken
- Ask for clarification when needed
- Confirm understanding before executing complex tasks
- Provide helpful suggestions when appropriate

Output Format:
Always respond with JSON containing:
{
  "text": "Your spoken response",
  "intent": "detected_intent",
  "entities": [{"type": "entity_type", "value": "entity_value"}],
  "emotion": "appropriate_emotion",
  "action": "action_to_take" // optional
}`;

  constructor(config: GeminiSessionConfig) {
    super();
    this.config = config;
    
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 1024,
      },
    });
  }

  // ============ LIFECYCLE ============

  async initialize(): Promise<void> {
    logger.info('Initializing Gemini session', { sessionId: this.config.sessionId });
    
    try {
      // Start chat session with system prompt
      this.chat = this.model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: 'System initialization. Please acknowledge.' }],
          },
          {
            role: 'model',
            parts: [{ text: JSON.stringify({
              text: "Hello! I'm Zara, your Plugspace assistant. I'm ready to help you build amazing websites. What would you like to create today?",
              intent: 'greeting',
              entities: [],
              emotion: 'friendly',
            }) }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
        },
      });

      logger.info('Gemini session initialized', { sessionId: this.config.sessionId });
    } catch (error) {
      logger.error('Failed to initialize Gemini session', {
        sessionId: this.config.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async startSession(): Promise<void> {
    this.isStreaming = true;
    this.audioBuffer = [];
    this.transcriptBuffer = '';
    this.lastActivity = new Date();
    
    logger.info('Gemini streaming started', { sessionId: this.config.sessionId });
  }

  async disconnect(): Promise<void> {
    this.isStreaming = false;
    this.audioBuffer = [];
    this.chat = null;
    
    logger.info('Gemini session disconnected', { sessionId: this.config.sessionId });
  }

  // ============ AUDIO STREAMING ============

  async sendAudio(chunk: Buffer): Promise<void> {
    if (!this.isStreaming) {
      logger.warn('Attempted to send audio while not streaming', {
        sessionId: this.config.sessionId,
      });
      return;
    }

    this.audioBuffer.push(chunk);
    this.lastActivity = new Date();

    // For now, we'll simulate transcription since Gemini Live API
    // requires specific SDK integration. In production, this would
    // use the actual Gemini Live streaming API.
    
    // Emit partial transcript for real-time feedback
    if (this.audioBuffer.length % 10 === 0) {
      this.emit('partial_transcript', {
        text: '...',
        isFinal: false,
      });
    }
  }

  async endTurn(): Promise<void> {
    if (!this.isStreaming || this.audioBuffer.length === 0) {
      return;
    }

    this.isStreaming = false;
    
    // In production, this would process the accumulated audio
    // through Gemini's speech-to-text. For now, we simulate.
    
    // Emit final transcript
    // This would be replaced with actual Gemini transcription
    logger.info('Audio turn ended', {
      sessionId: this.config.sessionId,
      chunks: this.audioBuffer.length,
    });

    this.audioBuffer = [];
  }

  // ============ TEXT PROCESSING ============

  async sendText(text: string): Promise<void> {
    if (!this.chat) {
      await this.initialize();
    }

    this.lastActivity = new Date();

    try {
      // Emit transcript event
      const transcript: Transcript = {
        text,
        isFinal: true,
        confidence: 1.0,
        language: this.config.language,
        startTime: 0,
        endTime: 0,
      };
      this.emit('transcript', transcript);

      // Process through Gemini
      const result = await this.chat!.sendMessage(text);
      const responseText = result.response.text();

      // Parse response
      let response: GeminiResponse;
      try {
        response = JSON.parse(responseText);
      } catch {
        // If not valid JSON, wrap in standard format
        response = {
          text: responseText,
          intent: 'general_response',
          entities: [],
          emotion: 'neutral',
          confidence: 0.8,
        };
      }

      // Enhance response with NLP if enabled
      if (this.config.features.intentDetection) {
        const enhancedResponse = await this.enhanceWithNLP(text, response);
        response = enhancedResponse;
      }

      this.emit('response', response);

    } catch (error) {
      logger.error('Error processing text', {
        sessionId: this.config.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.emit('error', error);
    }
  }

  // ============ NLP ENHANCEMENT ============

  private async enhanceWithNLP(
    userText: string,
    response: GeminiResponse
  ): Promise<GeminiResponse> {
    // Detect intent from user text
    const intent = this.detectIntent(userText);
    const entities = this.extractEntities(userText);
    const sentiment = this.analyzeSentiment(userText);

    return {
      ...response,
      intent: intent.intent,
      entities: [...(response.entities || []), ...entities],
      emotion: this.mapSentimentToEmotion(sentiment),
    };
  }

  private detectIntent(text: string): { intent: string; confidence: number } {
    const lowerText = text.toLowerCase();

    // Intent patterns
    const patterns: Array<{ intent: string; patterns: RegExp[]; confidence: number }> = [
      {
        intent: 'create_project',
        patterns: [
          /create|build|make|start|new/i,
          /website|site|page|app|application/i,
        ],
        confidence: 0.9,
      },
      {
        intent: 'modify_design',
        patterns: [
          /change|modify|update|edit|adjust/i,
          /color|font|style|design|layout|theme/i,
        ],
        confidence: 0.85,
      },
      {
        intent: 'add_section',
        patterns: [
          /add|include|insert|put/i,
          /section|component|feature|element|block/i,
        ],
        confidence: 0.85,
      },
      {
        intent: 'clone_website',
        patterns: [
          /clone|copy|replicate|like|similar/i,
          /from|website|site|page/i,
        ],
        confidence: 0.9,
      },
      {
        intent: 'deploy',
        patterns: [
          /deploy|publish|launch|go live|release/i,
        ],
        confidence: 0.95,
      },
      {
        intent: 'export',
        patterns: [
          /export|download|save|get code/i,
        ],
        confidence: 0.9,
      },
      {
        intent: 'help',
        patterns: [
          /help|how|what|can you|explain/i,
        ],
        confidence: 0.8,
      },
      {
        intent: 'navigation',
        patterns: [
          /show|go to|open|navigate|view/i,
        ],
        confidence: 0.85,
      },
    ];

    for (const { intent, patterns, confidence } of patterns) {
      const matchCount = patterns.filter(p => p.test(lowerText)).length;
      if (matchCount >= Math.ceil(patterns.length / 2)) {
        return { intent, confidence: confidence * (matchCount / patterns.length) };
      }
    }

    return { intent: 'general', confidence: 0.5 };
  }

  private extractEntities(text: string): Entity[] {
    const entities: Entity[] = [];

    // URL extraction
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let urlMatch;
    while ((urlMatch = urlRegex.exec(text)) !== null) {
      entities.push({
        type: 'url',
        value: urlMatch[1],
        confidence: 1.0,
        start: urlMatch.index,
        end: urlMatch.index + urlMatch[1].length,
      });
    }

    // Color extraction
    const colorRegex = /#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|\b(red|blue|green|yellow|purple|orange|pink|black|white|gray|grey)\b/gi;
    let colorMatch;
    while ((colorMatch = colorRegex.exec(text)) !== null) {
      entities.push({
        type: 'color',
        value: colorMatch[0],
        confidence: 0.95,
        start: colorMatch.index,
        end: colorMatch.index + colorMatch[0].length,
      });
    }

    // Section types
    const sectionTypes = ['hero', 'features', 'pricing', 'testimonials', 'contact', 'about', 'faq', 'gallery', 'team', 'footer', 'header', 'navigation'];
    for (const section of sectionTypes) {
      const regex = new RegExp(`\\b${section}\\b`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        entities.push({
          type: 'section_type',
          value: section,
          confidence: 0.9,
          start: match.index,
          end: match.index + section.length,
        });
      }
    }

    // Industry detection
    const industries = ['restaurant', 'ecommerce', 'saas', 'portfolio', 'blog', 'agency', 'healthcare', 'education', 'finance', 'real estate'];
    for (const industry of industries) {
      if (text.toLowerCase().includes(industry)) {
        entities.push({
          type: 'industry',
          value: industry,
          confidence: 0.85,
          start: text.toLowerCase().indexOf(industry),
          end: text.toLowerCase().indexOf(industry) + industry.length,
        });
      }
    }

    return entities;
  }

  private analyzeSentiment(text: string): number {
    const positiveWords = ['love', 'great', 'awesome', 'amazing', 'perfect', 'excellent', 'good', 'nice', 'beautiful', 'wonderful'];
    const negativeWords = ['hate', 'bad', 'terrible', 'awful', 'horrible', 'ugly', 'wrong', 'broken', 'error', 'problem'];

    const lowerText = text.toLowerCase();
    let score = 0;

    for (const word of positiveWords) {
      if (lowerText.includes(word)) score += 0.2;
    }

    for (const word of negativeWords) {
      if (lowerText.includes(word)) score -= 0.2;
    }

    return Math.max(-1, Math.min(1, score));
  }

  private mapSentimentToEmotion(sentiment: number): string {
    if (sentiment > 0.3) return 'happy';
    if (sentiment < -0.3) return 'concerned';
    return 'neutral';
  }

  // ============ CONFIGURATION ============

  setLanguage(language: string): void {
    this.config.language = language;
    logger.info('Language updated', { sessionId: this.config.sessionId, language });
  }

  setVoiceProfile(profile: any): void {
    // Update voice profile for TTS
    logger.info('Voice profile updated', { sessionId: this.config.sessionId, profile });
  }

  enableFeature(feature: keyof SessionFeatures): void {
    this.config.features[feature] = true;
    logger.info('Feature enabled', { sessionId: this.config.sessionId, feature });
  }

  disableFeature(feature: keyof SessionFeatures): void {
    this.config.features[feature] = false;
    logger.info('Feature disabled', { sessionId: this.config.sessionId, feature });
  }

  // ============ EVENT HANDLERS ============

  onTranscript(handler: (transcript: Transcript) => void): void {
    this.on('transcript', handler);
  }

  onResponse(handler: (response: GeminiResponse) => void): void {
    this.on('response', handler);
  }

  onError(handler: (error: Error) => void): void {
    this.on('error', handler);
  }

  // ============ METRICS ============

  getMetrics(): SessionMetrics {
    return {
      sessionId: this.config.sessionId,
      isStreaming: this.isStreaming,
      audioBufferSize: this.audioBuffer.reduce((sum, b) => sum + b.length, 0),
      lastActivity: this.lastActivity,
      language: this.config.language,
      features: this.config.features,
    };
  }

  getHealthStatus(): HealthStatus {
    const timeSinceActivity = Date.now() - this.lastActivity.getTime();
    
    return {
      healthy: this.chat !== null && timeSinceActivity < 300000, // 5 min timeout
      lastActivity: this.lastActivity,
      isStreaming: this.isStreaming,
      chatInitialized: this.chat !== null,
    };
  }
}

// ============ INTERFACES ============

interface SessionMetrics {
  sessionId: string;
  isStreaming: boolean;
  audioBufferSize: number;
  lastActivity: Date;
  language: string;
  features: SessionFeatures;
}

interface HealthStatus {
  healthy: boolean;
  lastActivity: Date;
  isStreaming: boolean;
  chatInitialized: boolean;
}

export default GeminiLiveSession;
