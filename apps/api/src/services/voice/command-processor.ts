// ==============================================
// PLUGSPACE.IO TITAN v1.4 - VOICE COMMAND PROCESSOR
// ==============================================
// Natural language command processing for
// voice-driven website building
// ==============================================

import { Redis } from 'ioredis';
import { IntentDetectionService, IntentResult, Entity } from '../nlp/intent-detection';
import { DialogueManager, DialogueResponse } from '../nlp/dialogue-manager';
import { logger } from '../../lib/logger';

// ============ TYPES ============

export interface VoiceCommand {
  text: string;
  sessionId: string;
  userId: string;
  projectId?: string;
  context?: CommandContext;
}

export interface CommandContext {
  currentPage?: string;
  selectedElement?: string;
  recentActions: string[];
  conversationHistory: ConversationTurn[];
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
}

export interface CommandResult {
  success: boolean;
  action: string;
  parameters: Record<string, any>;
  response: string;
  suggestions?: string[];
  requiresConfirmation?: boolean;
  followUp?: string;
}

export interface CommandSequence {
  commands: ParsedCommand[];
  executionOrder: number[];
  dependencies: Map<number, number[]>;
}

export interface ParsedCommand {
  action: string;
  target: string;
  parameters: Record<string, any>;
  confidence: number;
}

// ============ COMMAND PATTERNS ============

const COMMAND_PATTERNS = {
  create: {
    patterns: [
      /create\s+(?:a\s+)?(?:new\s+)?(.+?)(?:\s+website|\s+site|\s+page)?(?:\s+(?:with|for|about)\s+(.+))?$/i,
      /build\s+(?:me\s+)?(?:a\s+)?(.+?)(?:\s+website|\s+site)?(?:\s+(?:with|for)\s+(.+))?$/i,
      /make\s+(?:a\s+)?(.+?)(?:\s+website|\s+site|\s+page)?$/i,
      /i\s+(?:want|need)\s+(?:a\s+)?(.+?)(?:\s+website|\s+site)?$/i,
    ],
    extract: (match: RegExpMatchArray) => ({
      projectType: match[1]?.trim(),
      features: match[2]?.trim(),
    }),
  },
  modify: {
    patterns: [
      /(?:change|modify|update|make)\s+(?:the\s+)?(.+?)\s+(?:to|into)\s+(.+)$/i,
      /set\s+(?:the\s+)?(.+?)\s+to\s+(.+)$/i,
      /use\s+(.+?)\s+(?:for|as)\s+(?:the\s+)?(.+)$/i,
    ],
    extract: (match: RegExpMatchArray) => ({
      target: match[1]?.trim(),
      value: match[2]?.trim(),
    }),
  },
  add: {
    patterns: [
      /add\s+(?:a\s+)?(.+?)(?:\s+section|\s+component)?(?:\s+to\s+(?:the\s+)?(.+))?$/i,
      /include\s+(?:a\s+)?(.+?)(?:\s+in\s+(?:the\s+)?(.+))?$/i,
      /insert\s+(?:a\s+)?(.+?)(?:\s+(?:in|on|to)\s+(?:the\s+)?(.+))?$/i,
    ],
    extract: (match: RegExpMatchArray) => ({
      element: match[1]?.trim(),
      location: match[2]?.trim(),
    }),
  },
  remove: {
    patterns: [
      /(?:remove|delete|take out)\s+(?:the\s+)?(.+?)(?:\s+(?:from|section|component))?$/i,
      /get\s+rid\s+of\s+(?:the\s+)?(.+)$/i,
    ],
    extract: (match: RegExpMatchArray) => ({
      element: match[1]?.trim(),
    }),
  },
  clone: {
    patterns: [
      /clone\s+(?:the\s+)?(?:website\s+)?(?:from\s+)?(.+)$/i,
      /copy\s+(?:the\s+)?(?:design\s+)?(?:from\s+)?(.+)$/i,
      /(?:make|build)\s+(?:something\s+)?like\s+(.+)$/i,
      /replicate\s+(.+)$/i,
    ],
    extract: (match: RegExpMatchArray) => ({
      url: match[1]?.trim(),
    }),
  },
  navigate: {
    patterns: [
      /(?:show|go\s+to|open|navigate\s+to)\s+(?:the\s+)?(.+)$/i,
      /take\s+me\s+to\s+(?:the\s+)?(.+)$/i,
      /(?:let\s+me\s+)?see\s+(?:the\s+)?(.+)$/i,
    ],
    extract: (match: RegExpMatchArray) => ({
      destination: match[1]?.trim(),
    }),
  },
  deploy: {
    patterns: [
      /deploy(?:\s+(?:the\s+)?(?:project|website|site))?(?:\s+to\s+(.+))?$/i,
      /publish(?:\s+(?:the\s+)?(?:project|website|site))?(?:\s+to\s+(.+))?$/i,
      /(?:make\s+it\s+)?go\s+live$/i,
      /launch(?:\s+(?:the\s+)?(?:project|website|site))?$/i,
    ],
    extract: (match: RegExpMatchArray) => ({
      environment: match[1]?.trim() || 'production',
    }),
  },
  export: {
    patterns: [
      /export(?:\s+(?:the\s+)?(?:project|code))?(?:\s+as\s+(.+))?$/i,
      /download(?:\s+(?:the\s+)?(?:project|code))?$/i,
      /(?:give|get)\s+me\s+the\s+code$/i,
    ],
    extract: (match: RegExpMatchArray) => ({
      format: match[1]?.trim() || 'zip',
    }),
  },
  undo: {
    patterns: [
      /undo(?:\s+(?:the\s+)?last\s+(?:action|change))?$/i,
      /(?:go\s+)?back$/i,
      /revert(?:\s+(?:the\s+)?last\s+change)?$/i,
    ],
    extract: () => ({}),
  },
  redo: {
    patterns: [
      /redo$/i,
      /(?:do\s+it\s+)?again$/i,
    ],
    extract: () => ({}),
  },
};

// ============ VOICE COMMAND PROCESSOR ============

export class VoiceCommandProcessor {
  private redis: Redis;
  private intentService: IntentDetectionService;
  private dialogueManager: DialogueManager;

  // Context preservation
  private sessionContexts: Map<string, CommandContext> = new Map();

  constructor(redis: Redis) {
    this.redis = redis;
    this.intentService = new IntentDetectionService(redis);
    this.dialogueManager = new DialogueManager(redis);
  }

  // ============ MAIN PROCESSING ============

  async processCommand(command: VoiceCommand): Promise<CommandResult> {
    const { text, sessionId, userId, projectId, context } = command;

    try {
      // Get or create session context
      const sessionContext = this.getSessionContext(sessionId, context);

      // Process through dialogue manager for context-aware handling
      const dialogueResponse = await this.dialogueManager.processUserTurn(sessionId, text);

      // If dialogue manager needs clarification, return early
      if (dialogueResponse.action?.type === 'clarify') {
        return {
          success: true,
          action: 'clarify',
          parameters: {},
          response: dialogueResponse.text,
          suggestions: dialogueResponse.suggestions,
          requiresConfirmation: false,
        };
      }

      // If confirmation needed
      if (dialogueResponse.action?.type === 'confirm') {
        return {
          success: true,
          action: 'confirm',
          parameters: dialogueResponse.action.parameters || {},
          response: dialogueResponse.text,
          suggestions: dialogueResponse.suggestions,
          requiresConfirmation: true,
        };
      }

      // Extract command from text
      const parsedCommand = await this.parseCommand(text, sessionContext);

      // Validate command
      const validation = this.validateCommand(parsedCommand);
      if (!validation.valid) {
        return {
          success: false,
          action: parsedCommand.action,
          parameters: parsedCommand.parameters,
          response: validation.message,
          suggestions: this.getSuggestions(parsedCommand.action),
        };
      }

      // Determine if confirmation is needed
      const needsConfirmation = this.requiresConfirmation(parsedCommand.action);

      // Update context
      this.updateContext(sessionId, text, parsedCommand.action);

      // Build result
      return {
        success: true,
        action: parsedCommand.action,
        parameters: parsedCommand.parameters,
        response: dialogueResponse.text || this.generateResponse(parsedCommand),
        suggestions: this.getSuggestions(parsedCommand.action),
        requiresConfirmation: needsConfirmation,
        followUp: this.getFollowUp(parsedCommand.action),
      };

    } catch (error) {
      logger.error('Command processing error', {
        sessionId,
        text,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        action: 'error',
        parameters: {},
        response: "I'm sorry, I had trouble understanding that. Could you try again?",
        suggestions: ['Create a new website', 'Modify design', 'Add section'],
      };
    }
  }

  // ============ COMMAND PARSING ============

  private async parseCommand(
    text: string,
    context: CommandContext
  ): Promise<ParsedCommand> {
    // Try pattern matching first
    for (const [action, config] of Object.entries(COMMAND_PATTERNS)) {
      for (const pattern of config.patterns) {
        const match = text.match(pattern);
        if (match) {
          const extracted = config.extract(match);
          return {
            action,
            target: extracted.target || extracted.element || extracted.projectType || '',
            parameters: extracted,
            confidence: 0.9,
          };
        }
      }
    }

    // Fall back to intent detection
    const intent = await this.intentService.detectIntent(text, {
      recentIntents: context.recentActions,
    });

    const entities = await this.intentService.extractEntities(text);

    return {
      action: this.mapIntentToAction(intent.intent),
      target: entities.find(e => e.type === 'section_type' || e.type === 'target')?.value || '',
      parameters: this.buildParameters(intent, entities),
      confidence: intent.confidence,
    };
  }

  private mapIntentToAction(intent: string): string {
    const mapping: Record<string, string> = {
      create_project: 'create',
      modify_design: 'modify',
      add_section: 'add',
      remove_section: 'remove',
      clone_website: 'clone',
      navigate: 'navigate',
      deploy: 'deploy',
      export: 'export',
      undo: 'undo',
      redo: 'redo',
      query_help: 'help',
      confirm: 'confirm',
      deny: 'cancel',
    };

    return mapping[intent] || 'unknown';
  }

  private buildParameters(intent: IntentResult, entities: Entity[]): Record<string, any> {
    const params: Record<string, any> = { ...intent.parameters };

    for (const entity of entities) {
      params[entity.type] = entity.value;
    }

    return params;
  }

  // ============ COMPLEX COMMANDS ============

  async parseComplexCommand(text: string): Promise<CommandSequence> {
    // Handle multi-step commands like "Create a restaurant website and add a booking system"
    const commands: ParsedCommand[] = [];
    const dependencies = new Map<number, number[]>();

    // Split by common conjunctions
    const parts = text.split(/\s+(?:and|then|also|after that)\s+/i);

    for (let i = 0; i < parts.length; i++) {
      const parsed = await this.parseCommand(parts[i], {
        recentActions: [],
        conversationHistory: [],
      });
      commands.push(parsed);

      // Commands after the first depend on previous ones
      if (i > 0) {
        dependencies.set(i, [i - 1]);
      }
    }

    return {
      commands,
      executionOrder: commands.map((_, i) => i),
      dependencies,
    };
  }

  // ============ VALIDATION ============

  private validateCommand(command: ParsedCommand): { valid: boolean; message: string } {
    if (command.confidence < 0.3) {
      return {
        valid: false,
        message: "I'm not sure what you'd like me to do. Could you be more specific?",
      };
    }

    // Action-specific validation
    switch (command.action) {
      case 'clone':
        if (!command.parameters.url) {
          return {
            valid: false,
            message: 'I need a website URL to clone. What site would you like me to analyze?',
          };
        }
        break;

      case 'modify':
        if (!command.parameters.target && !command.parameters.value) {
          return {
            valid: false,
            message: 'What would you like me to change?',
          };
        }
        break;

      case 'add':
        if (!command.parameters.element) {
          return {
            valid: false,
            message: 'What would you like me to add?',
          };
        }
        break;
    }

    return { valid: true, message: '' };
  }

  private requiresConfirmation(action: string): boolean {
    const confirmationRequired = ['deploy', 'delete', 'remove', 'clone', 'export'];
    return confirmationRequired.includes(action);
  }

  // ============ RESPONSE GENERATION ============

  private generateResponse(command: ParsedCommand): string {
    const responses: Record<string, string> = {
      create: `Perfect! I'll create a ${command.parameters.projectType || 'new'} website for you.`,
      modify: `Got it! I'll update the ${command.parameters.target || 'design'}.`,
      add: `I'll add ${command.parameters.element || 'that section'} for you.`,
      remove: `I'll remove the ${command.parameters.element || 'section'}.`,
      clone: `I'll analyze and clone the design from ${command.parameters.url}.`,
      navigate: `Taking you to ${command.parameters.destination}.`,
      deploy: `I'll deploy your website to ${command.parameters.environment || 'production'}.`,
      export: `I'll prepare your project for download.`,
      undo: `I've undone the last change.`,
      redo: `I've redone the action.`,
    };

    return responses[command.action] || "I'll help you with that.";
  }

  private getSuggestions(action: string): string[] {
    const suggestions: Record<string, string[]> = {
      create: ['Add more sections', 'Change the colors', 'Preview the site'],
      modify: ['Change fonts', 'Update layout', 'Adjust colors'],
      add: ['Add hero section', 'Add pricing table', 'Add contact form'],
      deploy: ['View live site', 'Update settings', 'Check analytics'],
      unknown: ['Create a website', 'Clone a design', 'Add sections'],
    };

    return suggestions[action] || suggestions.unknown;
  }

  private getFollowUp(action: string): string | undefined {
    const followUps: Record<string, string> = {
      create: 'Would you like me to add any specific sections?',
      modify: 'Anything else you\'d like to change?',
      add: 'Would you like to add anything else?',
      clone: 'I\'ll show you the analysis when it\'s ready.',
    };

    return followUps[action];
  }

  // ============ CONTEXT MANAGEMENT ============

  private getSessionContext(
    sessionId: string,
    provided?: CommandContext
  ): CommandContext {
    if (provided) {
      this.sessionContexts.set(sessionId, provided);
      return provided;
    }

    let context = this.sessionContexts.get(sessionId);
    if (!context) {
      context = {
        recentActions: [],
        conversationHistory: [],
      };
      this.sessionContexts.set(sessionId, context);
    }

    return context;
  }

  private updateContext(sessionId: string, text: string, action: string): void {
    const context = this.sessionContexts.get(sessionId);
    if (context) {
      context.recentActions.unshift(action);
      if (context.recentActions.length > 10) {
        context.recentActions.pop();
      }

      context.conversationHistory.push({
        role: 'user',
        content: text,
        timestamp: new Date(),
        intent: action,
      });

      if (context.conversationHistory.length > 20) {
        context.conversationHistory.shift();
      }
    }
  }

  async clearContext(sessionId: string): Promise<void> {
    this.sessionContexts.delete(sessionId);
    await this.dialogueManager.resetSession(sessionId);
  }

  // ============ REFERENCE RESOLUTION ============

  resolveReferences(text: string, context: CommandContext): string {
    // Resolve pronouns and references
    let resolved = text;

    // "this" and "that" typically refer to current selection or last mentioned element
    if (/\b(this|that)\b/i.test(text) && context.selectedElement) {
      resolved = resolved.replace(/\b(this|that)\b/gi, context.selectedElement);
    }

    // "it" refers to the last element mentioned
    if (/\bit\b/i.test(text)) {
      const lastElement = context.conversationHistory
        .slice()
        .reverse()
        .find(t => t.intent && ['add', 'modify', 'remove'].includes(t.intent));
      if (lastElement) {
        // Extract element from previous turn
        // This is simplified - production would use NLP
        resolved = resolved.replace(/\bit\b/gi, 'the element');
      }
    }

    // "again" refers to repeating the last action
    if (/\bagain\b/i.test(text) && context.recentActions.length > 0) {
      // The action will be inferred from context
    }

    return resolved;
  }
}

export default VoiceCommandProcessor;
