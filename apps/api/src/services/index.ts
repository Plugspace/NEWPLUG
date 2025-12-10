// ==============================================
// PLUGSPACE.IO TITAN v1.4 - SERVICES INDEX
// ==============================================
// Export all services for easy import
// ==============================================

// LLM Provider
export {
  LLMService,
  getLLMService,
  type LLMProvider,
  type LLMModel,
  type LLMConfig,
  type LLMMessage,
  type LLMContent,
  type LLMResponse,
  type LLMOptions,
  type StreamChunk,
} from './llm/provider';

// Suggestion Engine
export {
  SuggestionEngine,
  type Suggestion,
  type SuggestionCategory,
  type SuggestionPriority,
  type SuggestionEffort,
  type SuggestionContext,
  type AnalyticsData,
} from './suggestions/engine';

// Agent Coordinator
export {
  AgentCoordinator,
  type WorkflowType,
  type WorkflowStatus,
  type WorkflowStep,
  type Workflow,
  type WorkflowInput,
  type WorkflowOutput,
  type WorkflowContext,
} from './orchestration/coordinator';
