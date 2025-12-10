// ==============================================
// PLUGSPACE.IO TITAN v1.4 - QUEUE WORKERS
// ==============================================
// Worker implementations for each agent type
// with error handling, progress reporting,
// and result passing between agents
// ==============================================

import { Job } from 'bullmq';
import { Redis } from 'ioredis';
import { QueueManager, AgentTask, TaskType } from '../manager';
import { LLMService, getLLMService } from '../../services/llm/provider';
import { AgentDon, ArchitectureOutput } from '../../agents/don.architect';
import { AgentJessica, DesignOutput } from '../../agents/jessica.designer';
import { AgentMark, CodeOutput } from '../../agents/mark.engineer';
import { AgentSherlock, AnalysisOutput } from '../../agents/sherlock.analyst';
import { logger } from '../../lib/logger';

// ============ WORKER FACTORY ============

export class WorkerFactory {
  private queueManager: QueueManager;
  private llm: LLMService;
  private redis: Redis;

  // Agent instances
  private don: AgentDon;
  private jessica: AgentJessica;
  private mark: AgentMark;
  private sherlock: AgentSherlock;

  constructor(queueManager: QueueManager, redis: Redis) {
    this.queueManager = queueManager;
    this.redis = redis;
    this.llm = getLLMService(redis);

    // Initialize agents
    this.don = new AgentDon(this.llm, redis);
    this.jessica = new AgentJessica(this.llm, redis);
    this.mark = new AgentMark(this.llm, redis);
    this.sherlock = new AgentSherlock(this.llm, redis);
  }

  // ============ REGISTER ALL WORKERS ============

  registerAllWorkers(): void {
    this.registerArchitectWorker();
    this.registerDesignWorker();
    this.registerCodeWorker();
    this.registerAnalyzeWorker();
    this.registerDeployWorker();
    this.registerExportWorker();

    logger.info('All workers registered');
  }

  // ============ ARCHITECT WORKER ============

  private registerArchitectWorker(): void {
    this.queueManager.registerWorker<ArchitectInput, ArchitectResult>(
      'ARCHITECT',
      async (task, job) => {
        logger.info('Architect worker processing', { taskId: task.id });

        const { prompt, context, options } = task.input;

        // Report progress
        await job.updateProgress({ stage: 'analyzing', progress: 10 });

        // Generate architecture
        const { architecture, response, suggestions } = await this.don.generateArchitecture(
          prompt,
          context || {},
          {
            projectId: task.projectId,
            userId: task.userId,
            organizationId: task.organizationId,
          }
        );

        await job.updateProgress({ stage: 'complete', progress: 100 });

        // Store architecture for downstream tasks
        await this.storeIntermediateResult(task.id, 'architecture', architecture);

        return {
          architecture,
          suggestions,
          usage: {
            inputTokens: response.usage.inputTokens,
            outputTokens: response.usage.outputTokens,
            cost: response.cost,
          },
        };
      }
    );
  }

  // ============ DESIGN WORKER ============

  private registerDesignWorker(): void {
    this.queueManager.registerWorker<DesignInput, DesignResult>(
      'DESIGN',
      async (task, job) => {
        logger.info('Design worker processing', { taskId: task.id });

        // Get architecture from parent task
        let architecture: ArchitectureOutput;
        
        if (task.input.architecture) {
          architecture = task.input.architecture;
        } else if (task.context.previousTasks.length > 0) {
          const parentResult = await this.getIntermediateResult(
            task.context.previousTasks[task.context.previousTasks.length - 1],
            'architecture'
          );
          architecture = parentResult as ArchitectureOutput;
        } else {
          throw new Error('No architecture provided for design task');
        }

        await job.updateProgress({ stage: 'generating', progress: 20 });

        // Generate design
        const { design, response, suggestions } = await this.jessica.generateDesign(
          architecture,
          task.input.context || {},
          {
            projectId: task.projectId,
            userId: task.userId,
            organizationId: task.organizationId,
          }
        );

        await job.updateProgress({ stage: 'complete', progress: 100 });

        // Store design for downstream tasks
        await this.storeIntermediateResult(task.id, 'design', design);

        return {
          design,
          suggestions,
          usage: {
            inputTokens: response.usage.inputTokens,
            outputTokens: response.usage.outputTokens,
            cost: response.cost,
          },
        };
      }
    );
  }

  // ============ CODE WORKER ============

  private registerCodeWorker(): void {
    this.queueManager.registerWorker<CodeInput, CodeResult>(
      'CODE',
      async (task, job) => {
        logger.info('Code worker processing', { taskId: task.id });

        // Get architecture and design from parent tasks
        let architecture: ArchitectureOutput;
        let design: DesignOutput;

        if (task.input.architecture && task.input.design) {
          architecture = task.input.architecture;
          design = task.input.design;
        } else {
          // Fetch from previous tasks
          for (const parentTaskId of task.context.previousTasks) {
            const archResult = await this.getIntermediateResult(parentTaskId, 'architecture');
            if (archResult) architecture = archResult as ArchitectureOutput;
            
            const designResult = await this.getIntermediateResult(parentTaskId, 'design');
            if (designResult) design = designResult as DesignOutput;
          }
        }

        if (!architecture! || !design!) {
          throw new Error('Missing architecture or design for code generation');
        }

        await job.updateProgress({ stage: 'generating', progress: 20 });

        // Generate code
        const { code, response } = await this.mark.generateCode(
          architecture,
          design,
          task.input.options || {},
          {
            projectId: task.projectId,
            userId: task.userId,
            organizationId: task.organizationId,
          }
        );

        await job.updateProgress({ stage: 'complete', progress: 100 });

        // Store code output
        await this.storeIntermediateResult(task.id, 'code', code);

        return {
          code,
          fileCount: code.files.length,
          usage: {
            inputTokens: response.usage.inputTokens,
            outputTokens: response.usage.outputTokens,
            cost: response.cost,
          },
        };
      }
    );
  }

  // ============ ANALYZE WORKER ============

  private registerAnalyzeWorker(): void {
    this.queueManager.registerWorker<AnalyzeInput, AnalyzeResult>(
      'ANALYZE',
      async (task, job) => {
        logger.info('Analyze worker processing', { taskId: task.id });

        const { url, options } = task.input;

        await job.updateProgress({ stage: 'capturing', progress: 10 });

        // Analyze website
        const { analysis, rawData } = await this.sherlock.analyzeWebsite(
          url,
          {
            projectId: task.projectId,
            userId: task.userId,
            organizationId: task.organizationId,
            ...options,
          }
        );

        await job.updateProgress({ stage: 'complete', progress: 100 });

        // Store analysis
        await this.storeIntermediateResult(task.id, 'analysis', analysis);

        return {
          analysis,
          screenshots: {
            desktop: !!rawData.screenshots.desktop,
            mobile: !!rawData.screenshots.mobile,
          },
        };
      }
    );
  }

  // ============ DEPLOY WORKER ============

  private registerDeployWorker(): void {
    this.queueManager.registerWorker<DeployInput, DeployResult>(
      'DEPLOY',
      async (task, job) => {
        logger.info('Deploy worker processing', { taskId: task.id });

        // Get code from previous task
        let code: CodeOutput;
        
        if (task.input.code) {
          code = task.input.code;
        } else {
          for (const parentTaskId of task.context.previousTasks) {
            const codeResult = await this.getIntermediateResult(parentTaskId, 'code');
            if (codeResult) code = codeResult as CodeOutput;
          }
        }

        if (!code!) {
          throw new Error('No code to deploy');
        }

        await job.updateProgress({ stage: 'preparing', progress: 20 });

        // TODO: Implement actual deployment logic
        // This would integrate with Hostinger VPS, Vercel, etc.

        await job.updateProgress({ stage: 'deploying', progress: 50 });

        // Simulate deployment
        await new Promise(resolve => setTimeout(resolve, 5000));

        await job.updateProgress({ stage: 'complete', progress: 100 });

        return {
          deploymentId: `deploy_${Date.now()}`,
          url: `https://${task.projectId}.plugspace.io`,
          environment: task.input.environment || 'preview',
          buildTime: 30,
          status: 'success',
        };
      }
    );
  }

  // ============ EXPORT WORKER ============

  private registerExportWorker(): void {
    this.queueManager.registerWorker<ExportInput, ExportResult>(
      'EXPORT',
      async (task, job) => {
        logger.info('Export worker processing', { taskId: task.id });

        // Get code from previous task or input
        let code: CodeOutput;
        
        if (task.input.code) {
          code = task.input.code;
        } else {
          for (const parentTaskId of task.context.previousTasks) {
            const codeResult = await this.getIntermediateResult(parentTaskId, 'code');
            if (codeResult) code = codeResult as CodeOutput;
          }
        }

        if (!code!) {
          throw new Error('No code to export');
        }

        await job.updateProgress({ stage: 'packaging', progress: 30 });

        // Create zip file
        const AdmZip = require('adm-zip');
        const zip = new AdmZip();

        for (const file of code.files) {
          zip.addFile(file.path, Buffer.from(file.content, 'utf8'));
        }

        const zipBuffer = zip.toBuffer();
        const zipBase64 = zipBuffer.toString('base64');

        await job.updateProgress({ stage: 'complete', progress: 100 });

        // Store export temporarily
        const exportKey = `plugspace:export:${task.id}`;
        await this.redis.setex(exportKey, 3600, zipBase64); // 1 hour expiry

        return {
          exportId: task.id,
          format: task.input.format || 'zip',
          size: zipBuffer.length,
          fileCount: code.files.length,
          downloadUrl: `/api/exports/${task.id}/download`,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        };
      }
    );
  }

  // ============ INTERMEDIATE RESULTS ============

  private async storeIntermediateResult(
    taskId: string,
    type: string,
    data: unknown
  ): Promise<void> {
    const key = `plugspace:result:${taskId}:${type}`;
    await this.redis.setex(key, 86400, JSON.stringify(data)); // 24 hours
  }

  private async getIntermediateResult(
    taskId: string,
    type: string
  ): Promise<unknown | null> {
    const key = `plugspace:result:${taskId}:${type}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }
}

// ============ INPUT/OUTPUT INTERFACES ============

interface ArchitectInput {
  prompt: string;
  context?: {
    industry?: string;
    style?: string;
    features?: string[];
    targetAudience?: string;
    budget?: 'low' | 'medium' | 'high';
    timeline?: 'urgent' | 'normal' | 'flexible';
  };
  options?: {
    includeTests?: boolean;
  };
}

interface ArchitectResult {
  architecture: ArchitectureOutput;
  suggestions: any[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
}

interface DesignInput {
  architecture?: ArchitectureOutput;
  context?: {
    industry?: string;
    style?: string;
    brandColors?: string[];
    referenceImage?: string;
    mood?: string;
  };
}

interface DesignResult {
  design: DesignOutput;
  suggestions: any[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
}

interface CodeInput {
  architecture?: ArchitectureOutput;
  design?: DesignOutput;
  options?: {
    includeTests?: boolean;
    includeStorybook?: boolean;
  };
}

interface CodeResult {
  code: CodeOutput;
  fileCount: number;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
}

interface AnalyzeInput {
  url: string;
  options?: {
    depth?: number;
    includeScreenshots?: boolean;
    analyzeTech?: boolean;
    analyzeDesign?: boolean;
    analyzePerformance?: boolean;
  };
}

interface AnalyzeResult {
  analysis: AnalysisOutput;
  screenshots: {
    desktop: boolean;
    mobile: boolean;
  };
}

interface DeployInput {
  code?: CodeOutput;
  environment?: 'preview' | 'staging' | 'production';
  domain?: string;
}

interface DeployResult {
  deploymentId: string;
  url: string;
  environment: string;
  buildTime: number;
  status: string;
}

interface ExportInput {
  code?: CodeOutput;
  format?: 'zip' | 'tar' | 'github';
}

interface ExportResult {
  exportId: string;
  format: string;
  size: number;
  fileCount: number;
  downloadUrl: string;
  expiresAt: string;
}

export default WorkerFactory;
