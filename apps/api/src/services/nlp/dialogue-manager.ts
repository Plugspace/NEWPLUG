// ==============================================
// PLUGSPACE.IO TITAN v1.4 - DIALOGUE MANAGER
// ==============================================
// Multi-turn conversation management with
// context tracking and clarification handling
// ==============================================

import { Redis } from 'ioredis';
import { IntentDetectionService, IntentResult, Entity } from './intent-detection';
import { logger } from '../../lib/logger';

// ============ TYPES ============

export type DialoguePhase = 
  | 'greeting'
  | 'intent_capture'
  | 'clarification'
  | 'confirmation'
  | 'execution'
  | 'feedback'
  | 'completion'
  | 'error';

export interface DialogueState {
  phase: DialoguePhase;
  turns: number;
  lastIntent: string;
  pendingIntent?: string;
  unresolved: string[];
  context: Map<string, any>;
  entities: Entity[];
  history: DialogueTurn[];
}

export interface DialogueTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
  entities?: Entity[];
  action?: string;
}

export interface DialogueAction {
  type: 'respond' | 'clarify' | 'confirm' | 'execute' | 'error';
  message?: string;
  options?: string[];
  action?: string;
  parameters?: Record<string, any>;
  requiresConfirmation?: boolean;
}

export interface DialogueResponse {
  text: string;
  action?: DialogueAction;
  suggestions?: string[];
  shouldExecute: boolean;
  metadata?: Record<string, any>;
}

// ============ DIALOGUE MANAGER CLASS ============

export class DialogueManager {
  private redis: Redis;
  private intentService: IntentDetectionService;
  private sessions: Map<string, DialogueState> = new Map();

  // Clarification templates
  private readonly CLARIFICATION_TEMPLATES = {
    missing_target: "I'd be happy to help with that. Could you tell me which {target} you'd like to {action}?",
    missing_value: "Great choice! What {attribute} would you like to use?",
    ambiguous_intent: "I want to make sure I understand correctly. Did you mean to {option1} or {option2}?",
    missing_url: "To clone a website, I'll need the URL. What's the website address you'd like me to analyze?",
    missing_section: "Which section would you like to {action}? For example: hero, features, pricing, or testimonials?",
    confirm_action: "Just to confirm, you'd like me to {action}. Is that correct?",
    confirm_complex: "This will {description}. Should I proceed?",
  };

  // Response templates
  private readonly RESPONSE_TEMPLATES = {
    greeting: [
      "Hello! I'm Zara, ready to help you build something amazing. What would you like to create?",
      "Hi there! What kind of website can I help you build today?",
    ],
    acknowledgment: [
      "Perfect! I'll get started on that right away.",
      "Got it! Let me work on that for you.",
      "Absolutely! I'm on it.",
    ],
    completion: [
      "All done! Take a look and let me know if you'd like any changes.",
      "I've finished that for you. How does it look?",
      "That's complete! Feel free to ask for adjustments.",
    ],
    error: [
      "I apologize, something went wrong. Let me try a different approach.",
      "Hmm, that didn't work as expected. Let me fix that.",
    ],
    not_understood: [
      "I'm not quite sure I understood that. Could you rephrase it?",
      "Sorry, I didn't catch that. Could you try saying it differently?",
    ],
  };

  constructor(redis: Redis) {
    this.redis = redis;
    this.intentService = new IntentDetectionService(redis);
  }

  // ============ SESSION MANAGEMENT ============

  async getOrCreateSession(sessionId: string): Promise<DialogueState> {
    // Check memory first
    let state = this.sessions.get(sessionId);
    if (state) return state;

    // Check Redis
    const key = `plugspace:dialogue:${sessionId}`;
    const stored = await this.redis.get(key);
    
    if (stored) {
      const parsed = JSON.parse(stored);
      state = {
        ...parsed,
        context: new Map(Object.entries(parsed.context || {})),
      };
      this.sessions.set(sessionId, state);
      return state;
    }

    // Create new session
    state = {
      phase: 'greeting',
      turns: 0,
      lastIntent: '',
      unresolved: [],
      context: new Map(),
      entities: [],
      history: [],
    };

    this.sessions.set(sessionId, state);
    return state;
  }

  private async saveSession(sessionId: string, state: DialogueState): Promise<void> {
    this.sessions.set(sessionId, state);
    
    const key = `plugspace:dialogue:${sessionId}`;
    const serializable = {
      ...state,
      context: Object.fromEntries(state.context),
    };
    
    await this.redis.setex(key, 3600, JSON.stringify(serializable));
  }

  // ============ TURN PROCESSING ============

  async processUserTurn(
    sessionId: string,
    input: string
  ): Promise<DialogueResponse> {
    const state = await this.getOrCreateSession(sessionId);
    state.turns++;

    try {
      // Detect intent
      const intentResult = await this.intentService.detectIntent(input, {
        recentIntents: state.history.slice(-5).map(t => t.intent).filter(Boolean) as string[],
      });

      // Extract entities
      const entities = await this.intentService.extractEntities(input);

      // Add to history
      const turn: DialogueTurn = {
        role: 'user',
        content: input,
        timestamp: new Date(),
        intent: intentResult.intent,
        entities,
      };
      state.history.push(turn);

      // Merge entities
      this.mergeEntities(state, entities);

      // Determine action
      const action = await this.determineAction(state, intentResult, entities);

      // Generate response
      const response = await this.generateResponse(state, action, intentResult);

      // Update state
      state.lastIntent = intentResult.intent;
      if (action.type === 'clarify') {
        state.phase = 'clarification';
        state.pendingIntent = intentResult.intent;
      } else if (action.type === 'confirm') {
        state.phase = 'confirmation';
        state.pendingIntent = intentResult.intent;
      } else if (action.type === 'execute') {
        state.phase = 'execution';
      }

      // Add assistant response to history
      state.history.push({
        role: 'assistant',
        content: response.text,
        timestamp: new Date(),
        action: action.type,
      });

      await this.saveSession(sessionId, state);

      return response;

    } catch (error) {
      logger.error('Dialogue processing error', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      state.phase = 'error';
      await this.saveSession(sessionId, state);

      return {
        text: this.getRandomTemplate('error'),
        shouldExecute: false,
      };
    }
  }

  // ============ ACTION DETERMINATION ============

  private async determineAction(
    state: DialogueState,
    intent: IntentResult,
    entities: Entity[]
  ): Promise<DialogueAction> {
    // Handle confirmation responses
    if (state.phase === 'confirmation') {
      if (intent.intent === 'confirm') {
        return {
          type: 'execute',
          action: state.pendingIntent,
          parameters: this.buildActionParameters(state),
        };
      }
      if (intent.intent === 'deny') {
        return {
          type: 'respond',
          message: "No problem! What would you like to do instead?",
        };
      }
    }

    // Handle clarification responses
    if (state.phase === 'clarification') {
      // User provided clarification, merge and re-evaluate
      if (state.pendingIntent) {
        return this.evaluateCompleteness(state, state.pendingIntent);
      }
    }

    // Low confidence - ask for clarification
    if (intent.confidence < 0.5) {
      return {
        type: 'clarify',
        message: this.getRandomTemplate('not_understood'),
      };
    }

    // Check if action requires confirmation
    const requiresConfirmation = this.requiresConfirmation(intent.intent);
    
    if (requiresConfirmation) {
      // Check completeness first
      const completeness = await this.checkCompleteness(intent.intent, state.entities);
      
      if (!completeness.complete) {
        return {
          type: 'clarify',
          message: this.generateClarificationQuestion(completeness.missing[0], intent.intent),
        };
      }

      return {
        type: 'confirm',
        message: this.generateConfirmation(intent.intent, state),
        action: intent.intent,
        requiresConfirmation: true,
      };
    }

    // Check completeness for execution
    const completeness = await this.checkCompleteness(intent.intent, state.entities);
    
    if (!completeness.complete) {
      return {
        type: 'clarify',
        message: this.generateClarificationQuestion(completeness.missing[0], intent.intent),
      };
    }

    // Ready to execute
    return {
      type: 'execute',
      action: intent.intent,
      parameters: this.buildActionParameters(state),
    };
  }

  private evaluateCompleteness(
    state: DialogueState,
    intent: string
  ): DialogueAction {
    // Re-check completeness with updated entities
    const requiredEntities = this.getRequiredEntities(intent);
    const hasAll = requiredEntities.every(req =>
      state.entities.some(e => e.type === req)
    );

    if (hasAll) {
      // Ready to confirm or execute
      if (this.requiresConfirmation(intent)) {
        return {
          type: 'confirm',
          message: this.generateConfirmation(intent, state),
          action: intent,
        };
      }
      return {
        type: 'execute',
        action: intent,
        parameters: this.buildActionParameters(state),
      };
    }

    // Still missing entities
    const missing = requiredEntities.filter(req =>
      !state.entities.some(e => e.type === req)
    );

    return {
      type: 'clarify',
      message: this.generateClarificationQuestion(missing[0], intent),
    };
  }

  // ============ COMPLETENESS CHECKING ============

  private async checkCompleteness(
    intent: string,
    entities: Entity[]
  ): Promise<{ complete: boolean; missing: string[] }> {
    const required = this.getRequiredEntities(intent);
    const missing = required.filter(req =>
      !entities.some(e => e.type === req)
    );

    return {
      complete: missing.length === 0,
      missing,
    };
  }

  private getRequiredEntities(intent: string): string[] {
    const requirements: Record<string, string[]> = {
      clone_website: ['url'],
      modify_design: ['target'],
      add_section: ['section_type'],
      remove_section: ['section_type'],
      navigate: ['destination'],
    };

    return requirements[intent] || [];
  }

  // ============ RESPONSE GENERATION ============

  private async generateResponse(
    state: DialogueState,
    action: DialogueAction,
    intent: IntentResult
  ): Promise<DialogueResponse> {
    let text: string;
    let suggestions: string[] = [];
    let shouldExecute = false;

    switch (action.type) {
      case 'respond':
        text = action.message || this.getRandomTemplate('acknowledgment');
        break;

      case 'clarify':
        text = action.message || '';
        suggestions = this.getSuggestions(intent.intent, state);
        break;

      case 'confirm':
        text = action.message || '';
        suggestions = ['Yes, proceed', 'No, cancel'];
        break;

      case 'execute':
        text = this.getRandomTemplate('acknowledgment');
        shouldExecute = true;
        break;

      case 'error':
        text = this.getRandomTemplate('error');
        break;

      default:
        text = "I'm processing that...";
    }

    return {
      text,
      action,
      suggestions,
      shouldExecute,
      metadata: {
        intent: intent.intent,
        confidence: intent.confidence,
        phase: state.phase,
      },
    };
  }

  // ============ CLARIFICATION GENERATION ============

  private generateClarificationQuestion(missing: string, intent: string): string {
    const templates: Record<string, string> = {
      url: "To proceed, I'll need the website URL. What's the address of the site you'd like to work with?",
      target: "Which element would you like to modify?",
      section_type: "What type of section would you like to add? For example: hero, features, pricing, testimonials, or contact.",
      destination: "Where would you like to navigate to?",
      color: "What color would you prefer?",
      style: "What style are you going for? Modern, minimal, bold, or something else?",
      industry: "What industry is this website for?",
    };

    return templates[missing] || `Could you provide more details about the ${missing.replace('_', ' ')}?`;
  }

  private generateConfirmation(intent: string, state: DialogueState): string {
    const descriptions: Record<string, string> = {
      deploy: 'publish your website and make it live',
      delete_project: 'permanently delete this project',
      clone_website: `analyze and clone the design from ${state.entities.find(e => e.type === 'url')?.value || 'the website'}`,
      export: 'export your project as a downloadable package',
    };

    const description = descriptions[intent] || `perform this action`;
    return `Just to confirm: you'd like me to ${description}. Should I proceed?`;
  }

  // ============ SUGGESTIONS ============

  private getSuggestions(intent: string, state: DialogueState): string[] {
    const suggestions: Record<string, string[]> = {
      add_section: ['Add a hero section', 'Add pricing', 'Add testimonials', 'Add contact form'],
      modify_design: ['Change colors', 'Update fonts', 'Adjust layout', 'Modify spacing'],
      create_project: ['Restaurant website', 'Portfolio site', 'SaaS landing page', 'E-commerce store'],
      unknown: ['Create a new website', 'Modify my design', 'Add a section', 'Deploy my site'],
    };

    return suggestions[intent] || suggestions.unknown;
  }

  // ============ CONTEXT MANAGEMENT ============

  async updateContext(sessionId: string, key: string, value: any): Promise<void> {
    const state = await this.getOrCreateSession(sessionId);
    state.context.set(key, value);
    await this.saveSession(sessionId, state);
  }

  async getContext(sessionId: string, key: string): Promise<any> {
    const state = await this.getOrCreateSession(sessionId);
    return state.context.get(key);
  }

  async clearContext(sessionId: string): Promise<void> {
    const state = await this.getOrCreateSession(sessionId);
    state.context.clear();
    state.entities = [];
    state.unresolved = [];
    state.phase = 'greeting';
    await this.saveSession(sessionId, state);
  }

  // ============ ENTITY MANAGEMENT ============

  private mergeEntities(state: DialogueState, newEntities: Entity[]): void {
    for (const entity of newEntities) {
      const existing = state.entities.findIndex(e => e.type === entity.type);
      if (existing >= 0) {
        // Update if new one has higher confidence
        if (entity.confidence > state.entities[existing].confidence) {
          state.entities[existing] = entity;
        }
      } else {
        state.entities.push(entity);
      }
    }
  }

  private buildActionParameters(state: DialogueState): Record<string, any> {
    const params: Record<string, any> = {};
    
    for (const entity of state.entities) {
      params[entity.type] = entity.value;
    }

    // Add context values
    for (const [key, value] of state.context) {
      if (!params[key]) {
        params[key] = value;
      }
    }

    return params;
  }

  // ============ UTILITY ============

  private requiresConfirmation(intent: string): boolean {
    const confirmationRequired = ['deploy', 'delete_project', 'clone_website', 'export'];
    return confirmationRequired.includes(intent);
  }

  private getRandomTemplate(type: keyof typeof this.RESPONSE_TEMPLATES): string {
    const templates = this.RESPONSE_TEMPLATES[type];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  async getHistory(sessionId: string): Promise<DialogueTurn[]> {
    const state = await this.getOrCreateSession(sessionId);
    return state.history;
  }

  async resetSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    await this.redis.del(`plugspace:dialogue:${sessionId}`);
  }
}

export default DialogueManager;
