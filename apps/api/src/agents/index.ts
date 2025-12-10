// ==============================================
// PLUGSPACE.IO TITAN v1.4 - AGENTS INDEX
// ==============================================
// Export all AI agents for easy import
// ==============================================

export { AgentDon, ArchitectureOutput, ArchitectureOutputSchema, DesignSuggestion } from './don.architect';
export { AgentJessica, DesignOutput, DesignOutputSchema } from './jessica.designer';
export { AgentMark, CodeOutput, CodeOutputSchema, CodeFile } from './mark.engineer';
export { AgentSherlock, AnalysisOutput, AnalysisOutputSchema } from './sherlock.analyst';

// Re-export types
export type { 
  ArchitectureOutput as ArchitectureResult,
  DesignOutput as DesignResult,
  CodeOutput as CodeResult,
  AnalysisOutput as AnalysisResult,
} from './don.architect';
