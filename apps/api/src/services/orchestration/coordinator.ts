// ==============================================
// PLUGSPACE.IO TITAN v1.4 - AGENT COORDINATOR
// ==============================================
// Orchestrates multi-agent workflows with
// context passing, error recovery, and
// intelligent routing between agents
// ==============================================

import { EventEmitter } from 'events';
import { Redis } from 'ioredis';
import { QueueManager, AgentTask, TaskType, TaskPriority } from '../../queue/manager';
import { WorkerFactory } from '../../queue/workers';
import { LLMService, getLLMService } from '../llm/provider';
import { SuggestionEngine, Suggestion, SuggestionContext } from '../suggestions/engine';
import { AgentDon, ArchitectureOutput } from '../../agents/don.architect';
import { AgentJessica, DesignOutput } from '../../agents/jessica.designer';
import { AgentMark, CodeOutput } from '../../agents/mark.engineer';
import { AgentSherlock, AnalysisOutput } from '../../agents/sherlock.analyst';
import { logger } from '../../lib/logger';
import { AppError, ErrorCodes, SystemError } from '@plugspace/utils';

// ============ WORKFLOW TYPES ============

export type WorkflowType = 
  | 'create'          // Full workflow: Architecture → Design → Code
  | 'clone'           // Clone workflow: Analyze → Architecture → Design → Code
  | 'refine'          // Refinement: Update existing project
  | 'design-only'     // Design workflow: Architecture → Design
  | 'code-only'       // Code workflow: Architecture + Design → Code
  | 'analyze-only';   // Analysis only

export type WorkflowStatus = 
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface WorkflowStep {
  agent: TaskType;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  result?: unknown;
  error?: string;
}

export interface Workflow {
  id: string;
  type: WorkflowType;
  projectId: string;
  userId: string;
  organizationId: string;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  input: WorkflowInput;
  output?: WorkflowOutput;
  context: WorkflowContext;
  metrics: {
    startedAt: Date;
    completedAt?: Date;
    totalDuration?: number;
    totalTokens: number;
    totalCost: number;
  };
  suggestions: Suggestion[];
}

export interface WorkflowInput {
  prompt?: string;
  url?: string;
  architecture?: ArchitectureOutput;
  design?: DesignOutput;
  options: {
    industry?: string;
    style?: string;
    targetAudience?: string;
    brandColors?: string[];
    referenceImage?: string;
    includeTests?: boolean;
    skipDesign?: boolean;
    skipCode?: boolean;
  };
}

export interface WorkflowOutput {
  architecture?: ArchitectureOutput;
  design?: DesignOutput;
  code?: CodeOutput;
  analysis?: AnalysisOutput;
}

export interface WorkflowContext {
  userFeedback: string[];
  iterationCount: number;
  previousVersions: string[];
}

// ============ AGENT COORDINATOR ============

export class AgentCoordinator extends EventEmitter {
  private redis: Redis;
  private queueManager: QueueManager;
  private workerFactory: WorkerFactory;
  private llm: LLMService;
  private suggestionEngine: SuggestionEngine;

  // Direct agent instances for synchronous operations
  private don: AgentDon;
  private jessica: AgentJessica;
  private mark: AgentMark;
  private sherlock: AgentSherlock;

  constructor(redis: Redis) {
    super();
    this.redis = redis;
    this.llm = getLLMService(redis);
    
    // Initialize queue manager
    this.queueManager = new QueueManager({ redis });
    
    // Initialize worker factory and register workers
    this.workerFactory = new WorkerFactory(this.queueManager, redis);
    this.workerFactory.registerAllWorkers();

    // Initialize direct agent instances
    this.don = new AgentDon(this.llm, redis);
    this.jessica = new AgentJessica(this.llm, redis);
    this.mark = new AgentMark(this.llm, redis);
    this.sherlock = new AgentSherlock(this.llm, redis);

    // Initialize suggestion engine
    this.suggestionEngine = new SuggestionEngine(this.llm, redis);

    // Set up queue event handlers
    this.setupQueueEvents();
  }

  // ============ WORKFLOW EXECUTION ============

  async startWorkflow(
    type: WorkflowType,
    input: WorkflowInput,
    options: {
      projectId: string;
      userId: string;
      organizationId: string;
      priority?: TaskPriority;
      async?: boolean;
    }
  ): Promise<{
    workflowId: string;
    workflow?: Workflow;
  }> {
    const workflowId = this.generateWorkflowId();
    const priority = options.priority ?? 2;

    // Create workflow record
    const workflow: Workflow = {
      id: workflowId,
      type,
      projectId: options.projectId,
      userId: options.userId,
      organizationId: options.organizationId,
      status: 'pending',
      steps: this.getWorkflowSteps(type),
      input,
      context: {
        userFeedback: [],
        iterationCount: 0,
        previousVersions: [],
      },
      metrics: {
        startedAt: new Date(),
        totalTokens: 0,
        totalCost: 0,
      },
      suggestions: [],
    };

    // Store workflow
    await this.saveWorkflow(workflow);

    // Execute workflow
    if (options.async) {
      // Queue-based async execution
      await this.queueWorkflow(workflow, priority);
      return { workflowId };
    } else {
      // Direct synchronous execution with streaming
      const result = await this.executeWorkflow(workflow);
      return { workflowId, workflow: result };
    }
  }

  // ============ SYNCHRONOUS WORKFLOW EXECUTION ============

  private async executeWorkflow(workflow: Workflow): Promise<Workflow> {
    workflow.status = 'running';
    await this.saveWorkflow(workflow);

    try {
      const output: WorkflowOutput = {};

      for (const step of workflow.steps) {
        if (step.status === 'skipped') continue;

        step.status = 'running';
        step.startedAt = new Date();
        await this.saveWorkflow(workflow);

        this.emit('stepStarted', { workflowId: workflow.id, step: step.agent });

        try {
          const result = await this.executeStep(workflow, step, output);
          step.result = result;
          step.status = 'completed';
          step.completedAt = new Date();

          // Update output
          this.updateOutput(output, step.agent, result);

          this.emit('stepCompleted', {
            workflowId: workflow.id,
            step: step.agent,
            result,
          });

        } catch (error) {
          step.status = 'failed';
          step.error = error instanceof Error ? error.message : 'Unknown error';
          step.completedAt = new Date();

          // Try recovery
          const recovered = await this.attemptRecovery(workflow, step, error);
          if (!recovered) {
            throw error;
          }
        }

        await this.saveWorkflow(workflow);
      }

      // Generate suggestions
      workflow.suggestions = await this.suggestionEngine.generateSuggestions(
        output.architecture!,
        output.design || null,
        {
          industry: workflow.input.options.industry,
          targetAudience: workflow.input.options.targetAudience,
        }
      );

      workflow.output = output;
      workflow.status = 'completed';
      workflow.metrics.completedAt = new Date();
      workflow.metrics.totalDuration = 
        workflow.metrics.completedAt.getTime() - workflow.metrics.startedAt.getTime();

      await this.saveWorkflow(workflow);

      this.emit('workflowCompleted', { workflowId: workflow.id, output });

      return workflow;

    } catch (error) {
      workflow.status = 'failed';
      workflow.metrics.completedAt = new Date();
      await this.saveWorkflow(workflow);

      this.emit('workflowFailed', {
        workflowId: workflow.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  private async executeStep(
    workflow: Workflow,
    step: WorkflowStep,
    currentOutput: WorkflowOutput
  ): Promise<unknown> {
    const baseOptions = {
      projectId: workflow.projectId,
      userId: workflow.userId,
      organizationId: workflow.organizationId,
    };

    switch (step.agent) {
      case 'ARCHITECT': {
        const prompt = workflow.input.prompt || 'Create a modern web application';
        const { architecture, response, suggestions } = await this.don.generateArchitecture(
          prompt,
          {
            industry: workflow.input.options.industry,
            style: workflow.input.options.style,
            targetAudience: workflow.input.options.targetAudience,
          },
          baseOptions
        );
        
        workflow.metrics.totalTokens += response.usage.totalTokens;
        workflow.metrics.totalCost += response.cost;
        workflow.suggestions.push(...suggestions);
        
        return architecture;
      }

      case 'DESIGN': {
        const architecture = currentOutput.architecture || workflow.input.architecture;
        if (!architecture) {
          throw new Error('Architecture required for design step');
        }

        const { design, response, suggestions } = await this.jessica.generateDesign(
          architecture,
          {
            industry: workflow.input.options.industry,
            style: workflow.input.options.style,
            brandColors: workflow.input.options.brandColors,
            referenceImage: workflow.input.options.referenceImage,
          },
          baseOptions
        );

        workflow.metrics.totalTokens += response.usage.totalTokens;
        workflow.metrics.totalCost += response.cost;
        workflow.suggestions.push(...suggestions);

        return design;
      }

      case 'CODE': {
        const architecture = currentOutput.architecture || workflow.input.architecture;
        const design = currentOutput.design || workflow.input.design;
        
        if (!architecture || !design) {
          throw new Error('Architecture and design required for code step');
        }

        const { code, response } = await this.mark.generateCode(
          architecture,
          design,
          {
            includeTests: workflow.input.options.includeTests,
          },
          baseOptions
        );

        workflow.metrics.totalTokens += response.usage.totalTokens;
        workflow.metrics.totalCost += response.cost;

        return code;
      }

      case 'ANALYZE': {
        const url = workflow.input.url;
        if (!url) {
          throw new Error('URL required for analysis step');
        }

        const { analysis } = await this.sherlock.analyzeWebsite(url, {
          ...baseOptions,
          includeScreenshots: true,
          analyzeTech: true,
          analyzeDesign: true,
          analyzePerformance: true,
        });

        return analysis;
      }

      default:
        throw new Error(`Unknown step type: ${step.agent}`);
    }
  }

  private updateOutput(output: WorkflowOutput, agent: TaskType, result: unknown): void {
    switch (agent) {
      case 'ARCHITECT':
        output.architecture = result as ArchitectureOutput;
        break;
      case 'DESIGN':
        output.design = result as DesignOutput;
        break;
      case 'CODE':
        output.code = result as CodeOutput;
        break;
      case 'ANALYZE':
        output.analysis = result as AnalysisOutput;
        break;
    }
  }

  // ============ STREAMING EXECUTION ============

  async *streamWorkflow(
    type: WorkflowType,
    input: WorkflowInput,
    options: {
      projectId: string;
      userId: string;
      organizationId: string;
    }
  ): AsyncGenerator<{
    type: 'workflow' | 'step' | 'progress' | 'suggestion' | 'complete' | 'error';
    data: any;
  }> {
    const workflowId = this.generateWorkflowId();
    
    const workflow: Workflow = {
      id: workflowId,
      type,
      projectId: options.projectId,
      userId: options.userId,
      organizationId: options.organizationId,
      status: 'running',
      steps: this.getWorkflowSteps(type),
      input,
      context: {
        userFeedback: [],
        iterationCount: 0,
        previousVersions: [],
      },
      metrics: {
        startedAt: new Date(),
        totalTokens: 0,
        totalCost: 0,
      },
      suggestions: [],
    };

    yield { type: 'workflow', data: { workflowId, steps: workflow.steps.map(s => s.agent) } };

    const output: WorkflowOutput = {};

    try {
      for (const step of workflow.steps) {
        if (step.status === 'skipped') continue;

        yield { type: 'step', data: { agent: step.agent, status: 'started' } };

        // Stream step execution
        for await (const chunk of this.streamStep(workflow, step, output, options)) {
          yield chunk;
        }

        yield { type: 'step', data: { agent: step.agent, status: 'completed' } };
      }

      // Generate and stream suggestions
      const suggestions = await this.suggestionEngine.generateSuggestions(
        output.architecture!,
        output.design || null,
        { industry: input.options.industry }
      );

      for (const suggestion of suggestions.slice(0, 5)) {
        yield { type: 'suggestion', data: suggestion };
      }

      workflow.output = output;
      workflow.status = 'completed';
      await this.saveWorkflow(workflow);

      yield { type: 'complete', data: { workflowId, output, suggestions } };

    } catch (error) {
      yield {
        type: 'error',
        data: { message: error instanceof Error ? error.message : 'Workflow failed' },
      };
    }
  }

  private async *streamStep(
    workflow: Workflow,
    step: WorkflowStep,
    output: WorkflowOutput,
    options: { projectId: string; userId: string; organizationId: string }
  ): AsyncGenerator<{ type: 'progress' | 'content'; data: any }> {
    switch (step.agent) {
      case 'ARCHITECT': {
        const prompt = workflow.input.prompt || 'Create a modern web application';
        
        for await (const chunk of this.don.streamArchitecture(
          prompt,
          { industry: workflow.input.options.industry },
          options
        )) {
          if (chunk.type === 'progress') {
            yield { type: 'progress', data: { agent: 'ARCHITECT', ...chunk.data } };
          } else if (chunk.type === 'content') {
            yield { type: 'content', data: { agent: 'ARCHITECT', ...chunk.data } };
          } else if (chunk.type === 'complete') {
            output.architecture = chunk.data.architecture;
            step.result = chunk.data.architecture;
          }
        }
        break;
      }

      case 'DESIGN': {
        if (!output.architecture) break;
        
        for await (const chunk of this.jessica.streamDesign(
          output.architecture,
          { style: workflow.input.options.style },
          options
        )) {
          if (chunk.type === 'progress') {
            yield { type: 'progress', data: { agent: 'DESIGN', ...chunk.data } };
          } else if (chunk.type === 'content') {
            yield { type: 'content', data: { agent: 'DESIGN', ...chunk.data } };
          } else if (chunk.type === 'complete') {
            output.design = chunk.data.design;
            step.result = chunk.data.design;
          }
        }
        break;
      }

      case 'CODE': {
        if (!output.architecture || !output.design) break;
        
        for await (const chunk of this.mark.streamCode(
          output.architecture,
          output.design,
          options
        )) {
          if (chunk.type === 'progress') {
            yield { type: 'progress', data: { agent: 'CODE', ...chunk.data } };
          } else if (chunk.type === 'file') {
            yield { type: 'content', data: { agent: 'CODE', file: chunk.data } };
          } else if (chunk.type === 'complete') {
            output.code = chunk.data.code;
            step.result = chunk.data.code;
          }
        }
        break;
      }

      case 'ANALYZE': {
        if (!workflow.input.url) break;
        
        for await (const chunk of this.sherlock.streamAnalysis(
          workflow.input.url,
          options
        )) {
          if (chunk.type === 'progress') {
            yield { type: 'progress', data: { agent: 'ANALYZE', ...chunk.data } };
          } else if (chunk.type === 'screenshot') {
            yield { type: 'content', data: { agent: 'ANALYZE', ...chunk.data } };
          } else if (chunk.type === 'complete') {
            output.analysis = chunk.data.analysis;
            step.result = chunk.data.analysis;
          }
        }
        break;
      }
    }
  }

  // ============ ASYNC QUEUE EXECUTION ============

  private async queueWorkflow(workflow: Workflow, priority: TaskPriority): Promise<void> {
    const { workflowId, taskIds } = await this.queueManager.addWorkflow(
      workflow.projectId,
      workflow.userId,
      workflow.organizationId,
      {
        prompt: workflow.input.prompt || '',
        context: workflow.input.options,
        options: {
          skipDesign: workflow.input.options.skipDesign,
          skipCode: workflow.input.options.skipCode,
        },
      },
      priority
    );

    // Update workflow with task IDs
    workflow.id = workflowId;
    await this.saveWorkflow(workflow);
  }

  // ============ WORKFLOW MANAGEMENT ============

  async getWorkflow(workflowId: string): Promise<Workflow | null> {
    const key = `plugspace:workflow:${workflowId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async pauseWorkflow(workflowId: string): Promise<boolean> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow || workflow.status !== 'running') return false;

    workflow.status = 'paused';
    await this.saveWorkflow(workflow);

    this.emit('workflowPaused', { workflowId });
    return true;
  }

  async resumeWorkflow(workflowId: string): Promise<boolean> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow || workflow.status !== 'paused') return false;

    workflow.status = 'running';
    await this.saveWorkflow(workflow);

    // Resume execution from the next pending step
    // In a real implementation, this would re-queue the remaining steps

    this.emit('workflowResumed', { workflowId });
    return true;
  }

  async cancelWorkflow(workflowId: string): Promise<boolean> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) return false;

    workflow.status = 'cancelled';
    await this.saveWorkflow(workflow);

    this.emit('workflowCancelled', { workflowId });
    return true;
  }

  async addFeedback(workflowId: string, feedback: string): Promise<boolean> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) return false;

    workflow.context.userFeedback.push(feedback);
    await this.saveWorkflow(workflow);

    return true;
  }

  // ============ REFINEMENT ============

  async refineWorkflow(
    workflowId: string,
    feedback: string,
    options: { projectId: string; userId: string; organizationId: string }
  ): Promise<Workflow> {
    const existing = await this.getWorkflow(workflowId);
    if (!existing || !existing.output) {
      throw new SystemError(ErrorCodes.NOT_FOUND, 'Workflow not found or incomplete');
    }

    // Store current version
    existing.context.previousVersions.push(workflowId);
    existing.context.userFeedback.push(feedback);
    existing.context.iterationCount++;

    // Create refinement workflow
    const refinement = await this.startWorkflow(
      'refine',
      {
        prompt: feedback,
        architecture: existing.output.architecture,
        design: existing.output.design,
        options: existing.input.options,
      },
      options
    );

    return refinement.workflow!;
  }

  // ============ ERROR RECOVERY ============

  private async attemptRecovery(
    workflow: Workflow,
    step: WorkflowStep,
    error: unknown
  ): Promise<boolean> {
    const retryableErrors = [
      ErrorCodes.RATE_LIMITED,
      ErrorCodes.TIMEOUT,
      ErrorCodes.EXTERNAL_SERVICE_ERROR,
    ];

    if (error instanceof AppError && retryableErrors.includes(error.code as string)) {
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      try {
        const output = workflow.output || {};
        const result = await this.executeStep(workflow, step, output);
        step.result = result;
        step.status = 'completed';
        this.updateOutput(output, step.agent, result);
        workflow.output = output;
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }

  // ============ UTILITY METHODS ============

  private getWorkflowSteps(type: WorkflowType): WorkflowStep[] {
    const stepConfigs: Record<WorkflowType, TaskType[]> = {
      'create': ['ARCHITECT', 'DESIGN', 'CODE'],
      'clone': ['ANALYZE', 'ARCHITECT', 'DESIGN', 'CODE'],
      'refine': ['ARCHITECT', 'DESIGN', 'CODE'],
      'design-only': ['ARCHITECT', 'DESIGN'],
      'code-only': ['CODE'],
      'analyze-only': ['ANALYZE'],
    };

    return stepConfigs[type].map(agent => ({
      agent,
      status: 'pending' as const,
    }));
  }

  private async saveWorkflow(workflow: Workflow): Promise<void> {
    const key = `plugspace:workflow:${workflow.id}`;
    await this.redis.setex(key, 86400 * 7, JSON.stringify(workflow)); // 7 days
  }

  private setupQueueEvents(): void {
    this.queueManager.on('taskCompleted', (data) => {
      this.emit('taskCompleted', data);
    });

    this.queueManager.on('taskFailed', (data) => {
      this.emit('taskFailed', data);
    });

    this.queueManager.on('taskProgress', (data) => {
      this.emit('taskProgress', data);
    });
  }

  private generateWorkflowId(): string {
    return `wf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // ============ CLEANUP ============

  async close(): Promise<void> {
    await this.queueManager.close();
  }
}

export default AgentCoordinator;
