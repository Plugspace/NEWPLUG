// ==============================================
// PLUGSPACE.IO TITAN v1.4 - QUEUE MANAGER
// ==============================================
// Redis-based task queue with BullMQ
// for agent orchestration, priority handling,
// and distributed processing
// ==============================================

import { Queue, Worker, Job, QueueEvents, FlowProducer } from 'bullmq';
import { Redis } from 'ioredis';
import { EventEmitter } from 'events';
import { logger } from '../lib/logger';
import { AppError, ErrorCodes, SystemError } from '@plugspace/utils';

// ============ TASK TYPES ============

export type TaskType = 'ARCHITECT' | 'DESIGN' | 'CODE' | 'ANALYZE' | 'DEPLOY' | 'EXPORT';
export type TaskStatus = 'pending' | 'processing' | 'complete' | 'failed' | 'retrying' | 'cancelled';
export type TaskPriority = 0 | 1 | 2 | 3; // 0=highest (enterprise), 3=lowest (free)

export interface AgentTask<T = unknown, R = unknown> {
  id: string;
  type: TaskType;
  projectId: string;
  organizationId: string;
  userId: string;
  priority: TaskPriority;
  input: T;
  context: {
    previousTasks: string[];
    userFeedback?: string[];
    iterationCount: number;
    maxIterations: number;
    parentTaskId?: string;
    chainedTasks?: string[];
  };
  status: TaskStatus;
  result?: R;
  error?: {
    message: string;
    code: string;
    stack?: string;
    retryable: boolean;
  };
  metrics: {
    queuedAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    duration?: number;
    tokensUsed?: number;
    cost?: number;
  };
  retryCount: number;
  maxRetries: number;
  ttl: number;
}

export interface QueueConfig {
  redis: Redis;
  concurrency?: number;
  maxRetries?: number;
  defaultTTL?: number;
  rateLimit?: {
    max: number;
    duration: number;
  };
}

// ============ QUEUE MANAGER CLASS ============

export class QueueManager extends EventEmitter {
  private redis: Redis;
  private queues: Map<TaskType, Queue> = new Map();
  private workers: Map<TaskType, Worker> = new Map();
  private queueEvents: Map<TaskType, QueueEvents> = new Map();
  private flowProducer: FlowProducer;
  private config: Required<QueueConfig>;

  constructor(config: QueueConfig) {
    super();
    
    this.redis = config.redis;
    this.config = {
      redis: config.redis,
      concurrency: config.concurrency || 5,
      maxRetries: config.maxRetries || 3,
      defaultTTL: config.defaultTTL || 3600,
      rateLimit: config.rateLimit || { max: 100, duration: 60000 },
    };

    // Initialize FlowProducer for complex workflows
    this.flowProducer = new FlowProducer({
      connection: this.redis,
    });

    // Initialize queues for each task type
    this.initializeQueues();
  }

  // ============ INITIALIZATION ============

  private initializeQueues(): void {
    const taskTypes: TaskType[] = ['ARCHITECT', 'DESIGN', 'CODE', 'ANALYZE', 'DEPLOY', 'EXPORT'];

    for (const type of taskTypes) {
      const queueName = `plugspace:${type.toLowerCase()}`;

      // Create queue
      const queue = new Queue(queueName, {
        connection: this.redis,
        defaultJobOptions: {
          attempts: this.config.maxRetries,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            age: 86400, // 24 hours
            count: 1000,
          },
          removeOnFail: {
            age: 604800, // 7 days
          },
        },
      });

      this.queues.set(type, queue);

      // Create queue events listener
      const events = new QueueEvents(queueName, {
        connection: this.redis,
      });

      events.on('completed', ({ jobId, returnvalue }) => {
        this.emit('taskCompleted', { type, jobId, result: returnvalue });
        logger.info('Task completed', { type, jobId });
      });

      events.on('failed', ({ jobId, failedReason }) => {
        this.emit('taskFailed', { type, jobId, error: failedReason });
        logger.error('Task failed', { type, jobId, error: failedReason });
      });

      events.on('progress', ({ jobId, data }) => {
        this.emit('taskProgress', { type, jobId, progress: data });
      });

      this.queueEvents.set(type, events);

      logger.info(`Queue initialized: ${queueName}`);
    }
  }

  // ============ TASK SUBMISSION ============

  async addTask<T, R>(task: Omit<AgentTask<T, R>, 'id' | 'status' | 'metrics' | 'retryCount'>): Promise<string> {
    const queue = this.queues.get(task.type);
    if (!queue) {
      throw new SystemError(
        ErrorCodes.SYSTEM_ERROR,
        `Unknown task type: ${task.type}`
      );
    }

    // Check rate limits
    await this.checkRateLimit(task.organizationId);

    // Check organization quotas
    await this.checkQuotas(task.organizationId, task.type);

    const taskId = this.generateTaskId(task.type);
    const fullTask: AgentTask<T, R> = {
      ...task,
      id: taskId,
      status: 'pending',
      metrics: {
        queuedAt: new Date(),
      },
      retryCount: 0,
      maxRetries: task.maxRetries || this.config.maxRetries,
      ttl: task.ttl || this.config.defaultTTL,
    };

    const job = await queue.add(taskId, fullTask, {
      jobId: taskId,
      priority: this.mapPriority(task.priority),
      delay: 0,
    });

    // Track in Redis
    await this.trackTask(fullTask);

    logger.info('Task added to queue', {
      taskId,
      type: task.type,
      projectId: task.projectId,
      priority: task.priority,
    });

    return taskId;
  }

  // ============ WORKFLOW ORCHESTRATION ============

  async addWorkflow(
    projectId: string,
    userId: string,
    organizationId: string,
    input: {
      prompt: string;
      context: Record<string, unknown>;
      options: {
        skipDesign?: boolean;
        skipCode?: boolean;
        includeAnalysis?: boolean;
      };
    },
    priority: TaskPriority = 2
  ): Promise<{
    workflowId: string;
    taskIds: string[];
  }> {
    const workflowId = this.generateWorkflowId();
    const taskIds: string[] = [];

    // Define workflow steps
    const steps: Array<{
      type: TaskType;
      name: string;
      dependsOn?: string;
    }> = [
      { type: 'ARCHITECT', name: 'architecture' },
    ];

    if (!input.options.skipDesign) {
      steps.push({ type: 'DESIGN', name: 'design', dependsOn: 'architecture' });
    }

    if (!input.options.skipCode) {
      steps.push({
        type: 'CODE',
        name: 'code',
        dependsOn: input.options.skipDesign ? 'architecture' : 'design',
      });
    }

    // Add optional analysis at the end
    if (input.options.includeAnalysis) {
      steps.push({ type: 'ANALYZE', name: 'analyze' });
    }

    // Create flow
    const flow = await this.flowProducer.add({
      name: workflowId,
      queueName: `plugspace:architect`,
      data: {
        id: `${workflowId}-root`,
        type: 'ARCHITECT',
        projectId,
        userId,
        organizationId,
        priority,
        input,
        context: {
          previousTasks: [],
          iterationCount: 0,
          maxIterations: 3,
          workflowId,
        },
        metrics: { queuedAt: new Date() },
        retryCount: 0,
        maxRetries: 3,
        ttl: 3600,
      },
      opts: {
        priority: this.mapPriority(priority),
      },
      children: steps.slice(1).map((step, index) => ({
        name: `${workflowId}-${step.name}`,
        queueName: `plugspace:${step.type.toLowerCase()}`,
        data: {
          id: `${workflowId}-${step.name}`,
          type: step.type,
          projectId,
          userId,
          organizationId,
          priority,
          input: {}, // Will be populated from parent result
          context: {
            previousTasks: steps.slice(0, index + 1).map(s => `${workflowId}-${s.name}`),
            iterationCount: 0,
            maxIterations: 3,
            workflowId,
          },
          metrics: { queuedAt: new Date() },
          retryCount: 0,
          maxRetries: 3,
          ttl: 3600,
        },
        opts: {
          priority: this.mapPriority(priority),
        },
      })),
    });

    // Track workflow
    await this.trackWorkflow(workflowId, {
      projectId,
      userId,
      organizationId,
      steps: steps.map(s => s.name),
      status: 'running',
      startedAt: new Date(),
    });

    logger.info('Workflow created', {
      workflowId,
      projectId,
      steps: steps.length,
    });

    return {
      workflowId,
      taskIds: steps.map(s => `${workflowId}-${s.name}`),
    };
  }

  // ============ WORKER REGISTRATION ============

  registerWorker<T, R>(
    type: TaskType,
    processor: (task: AgentTask<T, R>, job: Job) => Promise<R>
  ): void {
    const queueName = `plugspace:${type.toLowerCase()}`;

    const worker = new Worker(
      queueName,
      async (job: Job<AgentTask<T, R>>) => {
        const task = job.data;

        // Update status
        await this.updateTaskStatus(task.id, 'processing');
        task.metrics.startedAt = new Date();

        try {
          // Process task
          const result = await processor(task, job);

          // Update completion
          task.status = 'complete';
          task.result = result;
          task.metrics.completedAt = new Date();
          task.metrics.duration = Date.now() - task.metrics.startedAt!.getTime();

          await this.updateTaskStatus(task.id, 'complete', result);

          return result;

        } catch (error) {
          task.status = 'failed';
          task.error = {
            message: error instanceof Error ? error.message : 'Unknown error',
            code: error instanceof AppError ? error.code : 'UNKNOWN',
            stack: error instanceof Error ? error.stack : undefined,
            retryable: this.isRetryableError(error),
          };

          await this.updateTaskStatus(task.id, 'failed', undefined, task.error);

          throw error;
        }
      },
      {
        connection: this.redis,
        concurrency: this.getConcurrencyForType(type),
        limiter: {
          max: this.config.rateLimit.max,
          duration: this.config.rateLimit.duration,
        },
      }
    );

    worker.on('error', (error) => {
      logger.error('Worker error', { type, error: error.message });
    });

    worker.on('completed', (job) => {
      logger.info('Worker completed job', { type, jobId: job.id });
    });

    worker.on('failed', (job, error) => {
      logger.error('Worker job failed', { type, jobId: job?.id, error: error.message });
    });

    this.workers.set(type, worker);
    logger.info(`Worker registered for ${type}`);
  }

  // ============ TASK MANAGEMENT ============

  async getTask(taskId: string): Promise<AgentTask | null> {
    const key = `plugspace:task:${taskId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async cancelTask(taskId: string): Promise<boolean> {
    const task = await this.getTask(taskId);
    if (!task) return false;

    const queue = this.queues.get(task.type);
    if (!queue) return false;

    const job = await queue.getJob(taskId);
    if (job) {
      await job.remove();
    }

    await this.updateTaskStatus(taskId, 'cancelled');
    return true;
  }

  async retryTask(taskId: string): Promise<boolean> {
    const task = await this.getTask(taskId);
    if (!task || task.status !== 'failed') return false;

    const queue = this.queues.get(task.type);
    if (!queue) return false;

    const job = await queue.getJob(taskId);
    if (job) {
      await job.retry();
      await this.updateTaskStatus(taskId, 'pending');
      return true;
    }

    return false;
  }

  async getQueueStats(type?: TaskType): Promise<QueueStats[]> {
    const stats: QueueStats[] = [];

    const types = type ? [type] : Array.from(this.queues.keys());

    for (const t of types) {
      const queue = this.queues.get(t);
      if (!queue) continue;

      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      stats.push({
        type: t,
        waiting,
        active,
        completed,
        failed,
        delayed,
      });
    }

    return stats;
  }

  async getOrganizationTasks(
    organizationId: string,
    options: {
      status?: TaskStatus;
      type?: TaskType;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<AgentTask[]> {
    const pattern = `plugspace:task:*`;
    const tasks: AgentTask[] = [];

    const keys = await this.redis.keys(pattern);
    
    for (const key of keys.slice(options.offset || 0, (options.offset || 0) + (options.limit || 100))) {
      const data = await this.redis.get(key);
      if (data) {
        const task = JSON.parse(data) as AgentTask;
        if (task.organizationId === organizationId) {
          if (!options.status || task.status === options.status) {
            if (!options.type || task.type === options.type) {
              tasks.push(task);
            }
          }
        }
      }
    }

    return tasks;
  }

  // ============ RATE LIMITING & QUOTAS ============

  private async checkRateLimit(organizationId: string): Promise<void> {
    const key = `plugspace:ratelimit:${organizationId}`;
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, 60);
    }

    if (current > this.config.rateLimit.max) {
      throw new SystemError(
        ErrorCodes.RATE_LIMITED,
        'Organization rate limit exceeded. Please wait before submitting more tasks.'
      );
    }
  }

  private async checkQuotas(organizationId: string, type: TaskType): Promise<void> {
    // Get organization's subscription tier
    const tierKey = `plugspace:org:${organizationId}:tier`;
    const tier = await this.redis.get(tierKey) || 'free';

    const quotas: Record<string, Record<TaskType, number>> = {
      free: { ARCHITECT: 10, DESIGN: 10, CODE: 5, ANALYZE: 5, DEPLOY: 1, EXPORT: 5 },
      starter: { ARCHITECT: 100, DESIGN: 100, CODE: 50, ANALYZE: 50, DEPLOY: 10, EXPORT: 50 },
      professional: { ARCHITECT: 500, DESIGN: 500, CODE: 250, ANALYZE: 250, DEPLOY: 50, EXPORT: 250 },
      enterprise: { ARCHITECT: -1, DESIGN: -1, CODE: -1, ANALYZE: -1, DEPLOY: -1, EXPORT: -1 },
    };

    const limit = quotas[tier]?.[type] || 0;
    if (limit === -1) return; // Unlimited

    const usageKey = `plugspace:usage:${organizationId}:${type}:${this.getMonthKey()}`;
    const usage = parseInt(await this.redis.get(usageKey) || '0');

    if (usage >= limit) {
      throw new SystemError(
        ErrorCodes.QUOTA_EXCEEDED,
        `Monthly ${type} quota exceeded. Please upgrade your plan.`
      );
    }

    await this.redis.incr(usageKey);
    await this.redis.expire(usageKey, 2678400); // 31 days
  }

  // ============ TRACKING ============

  private async trackTask(task: AgentTask): Promise<void> {
    const key = `plugspace:task:${task.id}`;
    await this.redis.setex(key, task.ttl, JSON.stringify(task));

    // Add to organization's task list
    const listKey = `plugspace:org:${task.organizationId}:tasks`;
    await this.redis.lpush(listKey, task.id);
    await this.redis.ltrim(listKey, 0, 999); // Keep last 1000
  }

  private async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    result?: unknown,
    error?: AgentTask['error']
  ): Promise<void> {
    const key = `plugspace:task:${taskId}`;
    const data = await this.redis.get(key);
    
    if (data) {
      const task = JSON.parse(data) as AgentTask;
      task.status = status;
      if (result !== undefined) task.result = result;
      if (error) task.error = error;
      if (status === 'complete' || status === 'failed') {
        task.metrics.completedAt = new Date();
        task.metrics.duration = Date.now() - new Date(task.metrics.queuedAt).getTime();
      }
      await this.redis.setex(key, task.ttl, JSON.stringify(task));
    }
  }

  private async trackWorkflow(
    workflowId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const key = `plugspace:workflow:${workflowId}`;
    await this.redis.setex(key, 86400, JSON.stringify(data));
  }

  // ============ UTILITY METHODS ============

  private generateTaskId(type: TaskType): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return `${type.toLowerCase()}_${timestamp}_${random}`;
  }

  private generateWorkflowId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return `wf_${timestamp}_${random}`;
  }

  private mapPriority(priority: TaskPriority): number {
    // BullMQ uses lower number = higher priority
    return priority;
  }

  private getConcurrencyForType(type: TaskType): number {
    const concurrency: Record<TaskType, number> = {
      ARCHITECT: 5,
      DESIGN: 5,
      CODE: 3,
      ANALYZE: 3,
      DEPLOY: 2,
      EXPORT: 5,
    };
    return concurrency[type] || this.config.concurrency;
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof AppError) {
      const retryableCodes = [
        ErrorCodes.RATE_LIMITED,
        ErrorCodes.TIMEOUT,
        ErrorCodes.EXTERNAL_SERVICE_ERROR,
      ];
      return retryableCodes.includes(error.code as string);
    }
    return false;
  }

  private getMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  // ============ CLEANUP ============

  async close(): Promise<void> {
    for (const worker of this.workers.values()) {
      await worker.close();
    }
    for (const events of this.queueEvents.values()) {
      await events.close();
    }
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    await this.flowProducer.close();
  }
}

// ============ INTERFACES ============

interface QueueStats {
  type: TaskType;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export default QueueManager;
