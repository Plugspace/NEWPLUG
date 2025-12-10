// ==============================================
// PLUGSPACE.IO TITAN v1.4 - INTENT DETECTION
// ==============================================
// Vertex AI powered intent classification
// for voice command understanding
// ==============================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Redis } from 'ioredis';
import { logger } from '../../lib/logger';

// ============ TYPES ============

export interface IntentResult {
  intent: string;
  confidence: number;
  category: 'project_creation' | 'project_modification' | 'query' | 'command' | 'navigation' | 'system';
  subcategory?: string;
  parameters: Record<string, any>;
}

export interface Entity {
  type: string;
  value: string;
  confidence: number;
  start: number;
  end: number;
  metadata?: Record<string, any>;
}

export interface SentimentResult {
  score: number; // -1 to 1
  magnitude: number;
  label: 'positive' | 'neutral' | 'negative';
}

export interface ContextUnderstanding {
  clarificationNeeded: boolean;
  ambiguities: string[];
  resolvedIntent: string;
  suggestedActions: string[];
}

// ============ INTENT DEFINITIONS ============

export const INTENT_DEFINITIONS = {
  // Project Creation
  'create_project': {
    category: 'project_creation',
    patterns: [
      'create', 'build', 'make', 'start', 'new', 'generate', 'design'
    ],
    targets: ['website', 'site', 'page', 'app', 'application', 'landing page', 'project'],
    requiredEntities: [],
    optionalEntities: ['industry', 'style', 'features'],
  },
  
  // Design Modifications
  'modify_design': {
    category: 'project_modification',
    patterns: ['change', 'modify', 'update', 'edit', 'adjust', 'alter', 'make'],
    targets: ['color', 'font', 'style', 'design', 'layout', 'theme', 'background'],
    requiredEntities: ['target'],
    optionalEntities: ['value', 'section'],
  },
  
  // Section Management
  'add_section': {
    category: 'project_modification',
    patterns: ['add', 'include', 'insert', 'put', 'create'],
    targets: ['section', 'component', 'feature', 'element', 'block', 'part'],
    requiredEntities: ['section_type'],
    optionalEntities: ['position', 'content'],
  },
  
  'remove_section': {
    category: 'project_modification',
    patterns: ['remove', 'delete', 'take out', 'get rid of'],
    targets: ['section', 'component', 'feature', 'element', 'block'],
    requiredEntities: ['section_type'],
  },
  
  // Clone
  'clone_website': {
    category: 'project_creation',
    patterns: ['clone', 'copy', 'replicate', 'like', 'similar to', 'based on'],
    targets: ['website', 'site', 'page', 'design'],
    requiredEntities: ['url'],
  },
  
  // Deployment
  'deploy': {
    category: 'command',
    patterns: ['deploy', 'publish', 'launch', 'go live', 'release', 'ship'],
    targets: ['project', 'website', 'site', 'app'],
    optionalEntities: ['environment', 'domain'],
  },
  
  // Export
  'export': {
    category: 'command',
    patterns: ['export', 'download', 'save', 'get code', 'zip'],
    targets: ['project', 'code', 'files'],
    optionalEntities: ['format'],
  },
  
  // Navigation
  'navigate': {
    category: 'navigation',
    patterns: ['show', 'go to', 'open', 'navigate', 'view', 'see', 'display'],
    targets: ['page', 'section', 'project', 'dashboard', 'settings'],
    requiredEntities: ['destination'],
  },
  
  // Queries
  'query_status': {
    category: 'query',
    patterns: ['what', 'how', 'status', 'progress', 'check'],
    targets: ['project', 'deployment', 'generation'],
  },
  
  'query_help': {
    category: 'query',
    patterns: ['help', 'how do i', 'how to', 'can you', 'explain', 'what is'],
  },
  
  // Undo/Redo
  'undo': {
    category: 'command',
    patterns: ['undo', 'revert', 'go back', 'cancel', 'reverse'],
  },
  
  'redo': {
    category: 'command',
    patterns: ['redo', 'again', 'repeat'],
  },
  
  // System
  'stop': {
    category: 'system',
    patterns: ['stop', 'cancel', 'abort', 'halt', 'quit'],
  },
  
  'confirm': {
    category: 'system',
    patterns: ['yes', 'okay', 'sure', 'confirm', 'proceed', 'go ahead', 'do it'],
  },
  
  'deny': {
    category: 'system',
    patterns: ['no', 'cancel', 'stop', 'don\'t', 'never mind'],
  },
};

// ============ INTENT DETECTION SERVICE ============

export class IntentDetectionService {
  private genAI: GoogleGenerativeAI;
  private redis: Redis;
  private cache: Map<string, IntentResult> = new Map();

  constructor(redis: Redis) {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
    this.redis = redis;
  }

  // ============ MAIN DETECTION ============

  async detectIntent(text: string, context?: ConversationContext): Promise<IntentResult> {
    // Check cache first
    const cacheKey = this.getCacheKey(text);
    const cached = this.cache.get(cacheKey);
    if (cached && !context) {
      return cached;
    }

    try {
      // Rule-based detection first (faster)
      const ruleBasedResult = this.detectWithRules(text);
      
      // If high confidence, use rule-based result
      if (ruleBasedResult.confidence > 0.85) {
        this.cache.set(cacheKey, ruleBasedResult);
        return ruleBasedResult;
      }

      // Use AI for complex or ambiguous cases
      const aiResult = await this.detectWithAI(text, context);
      
      // Combine results
      const finalResult = this.combineResults(ruleBasedResult, aiResult);
      
      this.cache.set(cacheKey, finalResult);
      return finalResult;

    } catch (error) {
      logger.error('Intent detection error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Fallback to rule-based
      return this.detectWithRules(text);
    }
  }

  // ============ RULE-BASED DETECTION ============

  private detectWithRules(text: string): IntentResult {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);
    
    let bestMatch: IntentResult = {
      intent: 'unknown',
      confidence: 0,
      category: 'query',
      parameters: {},
    };

    for (const [intent, definition] of Object.entries(INTENT_DEFINITIONS)) {
      let score = 0;
      const matchedPatterns: string[] = [];
      const matchedTargets: string[] = [];

      // Check patterns
      for (const pattern of definition.patterns) {
        if (lowerText.includes(pattern)) {
          score += 0.3;
          matchedPatterns.push(pattern);
        }
      }

      // Check targets
      if (definition.targets) {
        for (const target of definition.targets) {
          if (lowerText.includes(target)) {
            score += 0.2;
            matchedTargets.push(target);
          }
        }
      }

      // Bonus for pattern + target combination
      if (matchedPatterns.length > 0 && matchedTargets.length > 0) {
        score += 0.2;
      }

      // Check required entities
      if (definition.requiredEntities) {
        const entities = this.extractBasicEntities(text);
        const hasRequired = definition.requiredEntities.every(req =>
          entities.some(e => e.type === req)
        );
        if (hasRequired) {
          score += 0.15;
        }
      }

      if (score > bestMatch.confidence) {
        bestMatch = {
          intent,
          confidence: Math.min(score, 0.95),
          category: definition.category as IntentResult['category'],
          parameters: {
            matchedPatterns,
            matchedTargets,
          },
        };
      }
    }

    return bestMatch;
  }

  // ============ AI-BASED DETECTION ============

  private async detectWithAI(
    text: string,
    context?: ConversationContext
  ): Promise<IntentResult> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `Analyze this user command and determine the intent.

User command: "${text}"
${context ? `Previous context: ${JSON.stringify(context.recentIntents)}` : ''}

Available intents:
${Object.entries(INTENT_DEFINITIONS).map(([intent, def]) =>
  `- ${intent}: ${def.patterns.slice(0, 3).join(', ')} (category: ${def.category})`
).join('\n')}

Respond with JSON only:
{
  "intent": "intent_name",
  "confidence": 0.0-1.0,
  "category": "category_name",
  "parameters": {}
}`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.error('AI intent detection failed', { error });
    }

    return {
      intent: 'unknown',
      confidence: 0.3,
      category: 'query',
      parameters: {},
    };
  }

  // ============ RESULT COMBINATION ============

  private combineResults(ruleResult: IntentResult, aiResult: IntentResult): IntentResult {
    // If both agree, boost confidence
    if (ruleResult.intent === aiResult.intent) {
      return {
        ...ruleResult,
        confidence: Math.min(0.98, ruleResult.confidence + aiResult.confidence * 0.2),
        parameters: { ...ruleResult.parameters, ...aiResult.parameters },
      };
    }

    // If AI is more confident, prefer AI
    if (aiResult.confidence > ruleResult.confidence + 0.1) {
      return aiResult;
    }

    return ruleResult;
  }

  // ============ ENTITY EXTRACTION ============

  async extractEntities(text: string): Promise<Entity[]> {
    const entities: Entity[] = [];

    // Basic entity extraction
    entities.push(...this.extractBasicEntities(text));

    // AI-enhanced extraction for complex entities
    const aiEntities = await this.extractEntitiesWithAI(text);
    entities.push(...aiEntities);

    // Deduplicate
    return this.deduplicateEntities(entities);
  }

  private extractBasicEntities(text: string): Entity[] {
    const entities: Entity[] = [];

    // URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
      entities.push({
        type: 'url',
        value: match[1],
        confidence: 1.0,
        start: match.index,
        end: match.index + match[1].length,
      });
    }

    // Colors
    const colorRegex = /#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|\b(red|blue|green|yellow|purple|orange|pink|black|white|gray|grey|navy|teal|cyan)\b/gi;
    while ((match = colorRegex.exec(text)) !== null) {
      entities.push({
        type: 'color',
        value: match[0].toLowerCase(),
        confidence: 0.95,
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    // Section types
    const sectionTypes = ['hero', 'features', 'pricing', 'testimonials', 'contact', 'about', 'faq', 'gallery', 'team', 'footer', 'header', 'navigation', 'cta', 'stats', 'partners', 'blog'];
    for (const section of sectionTypes) {
      const regex = new RegExp(`\\b${section}\\b`, 'gi');
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

    // Industries
    const industries = ['restaurant', 'ecommerce', 'e-commerce', 'saas', 'portfolio', 'blog', 'agency', 'healthcare', 'education', 'finance', 'fintech', 'real estate', 'fitness', 'travel', 'food', 'fashion', 'tech', 'startup'];
    for (const industry of industries) {
      if (text.toLowerCase().includes(industry)) {
        const idx = text.toLowerCase().indexOf(industry);
        entities.push({
          type: 'industry',
          value: industry,
          confidence: 0.85,
          start: idx,
          end: idx + industry.length,
        });
      }
    }

    // Style keywords
    const styles = ['modern', 'minimal', 'minimalist', 'bold', 'elegant', 'professional', 'playful', 'corporate', 'creative', 'clean', 'dark', 'light', 'colorful', 'monochrome'];
    for (const style of styles) {
      if (text.toLowerCase().includes(style)) {
        const idx = text.toLowerCase().indexOf(style);
        entities.push({
          type: 'style',
          value: style,
          confidence: 0.85,
          start: idx,
          end: idx + style.length,
        });
      }
    }

    return entities;
  }

  private async extractEntitiesWithAI(text: string): Promise<Entity[]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `Extract entities from this text for a website builder:

"${text}"

Entity types to look for:
- project_name: Name of the project/website
- page_name: Specific page names
- feature: Specific features requested
- target_audience: Who the website is for
- business_name: Company or business name
- content: Specific content to include

Respond with JSON array:
[{"type": "entity_type", "value": "extracted_value", "confidence": 0.0-1.0}]`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((e: any) => ({
          ...e,
          start: 0,
          end: 0,
        }));
      }
    } catch (error) {
      logger.error('AI entity extraction failed', { error });
    }

    return [];
  }

  private deduplicateEntities(entities: Entity[]): Entity[] {
    const seen = new Set<string>();
    return entities.filter(e => {
      const key = `${e.type}:${e.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ============ SENTIMENT ANALYSIS ============

  async analyzeSentiment(text: string): Promise<SentimentResult> {
    const positiveWords = ['love', 'great', 'awesome', 'amazing', 'perfect', 'excellent', 'good', 'nice', 'beautiful', 'wonderful', 'fantastic', 'brilliant'];
    const negativeWords = ['hate', 'bad', 'terrible', 'awful', 'horrible', 'ugly', 'wrong', 'broken', 'error', 'problem', 'issue', 'fail'];

    const lowerText = text.toLowerCase();
    let score = 0;
    let magnitude = 0;

    for (const word of positiveWords) {
      if (lowerText.includes(word)) {
        score += 0.15;
        magnitude += 0.1;
      }
    }

    for (const word of negativeWords) {
      if (lowerText.includes(word)) {
        score -= 0.15;
        magnitude += 0.1;
      }
    }

    score = Math.max(-1, Math.min(1, score));

    return {
      score,
      magnitude: Math.min(1, magnitude),
      label: score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral',
    };
  }

  // ============ CONTEXT UNDERSTANDING ============

  async understandContext(
    current: string,
    history: Message[]
  ): Promise<ContextUnderstanding> {
    const currentIntent = await this.detectIntent(current);
    const ambiguities: string[] = [];
    const suggestedActions: string[] = [];

    // Check for ambiguities
    if (currentIntent.confidence < 0.6) {
      ambiguities.push('Intent unclear - please provide more details');
    }

    // Check for missing required entities
    const entities = await this.extractEntities(current);
    const intentDef = INTENT_DEFINITIONS[currentIntent.intent as keyof typeof INTENT_DEFINITIONS];
    
    if (intentDef?.requiredEntities) {
      for (const required of intentDef.requiredEntities) {
        if (!entities.some(e => e.type === required)) {
          ambiguities.push(`Missing ${required} information`);
        }
      }
    }

    // Check context from history
    const recentIntents = history.slice(-3).map(m => m.metadata?.intent).filter(Boolean);
    
    // Suggest actions based on context
    if (currentIntent.intent === 'confirm' && recentIntents.length > 0) {
      suggestedActions.push(`Confirm ${recentIntents[recentIntents.length - 1]}`);
    }

    return {
      clarificationNeeded: ambiguities.length > 0 || currentIntent.confidence < 0.5,
      ambiguities,
      resolvedIntent: currentIntent.intent,
      suggestedActions,
    };
  }

  // ============ UTILITY ============

  private getCacheKey(text: string): string {
    return `intent:${text.toLowerCase().trim().slice(0, 100)}`;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// ============ INTERFACES ============

interface ConversationContext {
  recentIntents: string[];
  currentProject?: string;
  currentPage?: string;
}

interface Message {
  role: string;
  content: string;
  metadata?: Record<string, any>;
}

export default IntentDetectionService;
