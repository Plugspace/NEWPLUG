/**
 * Shared TypeScript types across the platform
 */

import { z } from 'zod';

// Agent Types
export const AgentNameSchema = z.enum(['DON', 'MARK', 'JESSICA', 'SHERLOCK', 'ZARA']);
export type AgentName = z.infer<typeof AgentNameSchema>;

// Architecture Output (Agent Don)
export interface ArchitectureOutput {
  components: string[];
  pages: string[];
  dataFlow: string[];
  integrations: string[];
  techStack: {
    frontend: string[];
    backend?: string[];
    database?: string[];
  };
}

// Design Output (Agent Jessica)
export interface DesignOutput {
  colorPalette: string[];
  typography: {
    primary: string;
    secondary?: string;
  };
  spacing: {
    unit: number;
    scale: number[];
  };
  components: {
    buttons: Record<string, any>;
    forms: Record<string, any>;
    cards: Record<string, any>;
  };
}

// Code Output (Agent Mark)
export interface CodeOutput {
  files: Record<string, string>;
  dependencies: Record<string, string>;
  buildConfig?: Record<string, any>;
}

// Clone Analysis (Agent Sherlock)
export interface CloneAnalysis {
  url: string;
  structure: {
    pages: string[];
    components: string[];
  };
  styles: {
    colors: string[];
    fonts: string[];
  };
  content: {
    text: string[];
    images: string[];
  };
}

// Voice Command
export interface VoiceCommand {
  transcript: string;
  intent: string;
  entities: Record<string, any>;
  timestamp: number;
}
