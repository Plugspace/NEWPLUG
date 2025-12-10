// ==============================================
// PLUGSPACE.IO TITAN v1.4 - AGENT ROUTER
// ==============================================
// API endpoints for direct agent interactions,
// workflow management, and agent health monitoring
// ==============================================

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Redis } from 'ioredis';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { QueueManager, TaskType, TaskPriority } from '../queue/manager';
import { AgentCoordinator } from '../services/orchestration/coordinator';
import { getLLMService } from '../services/llm/provider';
import { logger } from '../lib/logger';

// ============ INPUT SCHEMAS ============

const taskSchema = z.object({
  type: z.enum(['ARCHITECT', 'DESIGN', 'CODE', 'ANALYZE', 'DEPLOY', 'EXPORT']),
  input: z.record(z.any()),
  priority: z.number().min(0).max(3).optional(),
  context: z.object({
    previousTasks: z.array(z.string()).optional(),
    userFeedback: z.array(z.string()).optional(),
  }).optional(),
});

const workflowSchema = z.object({
  type: z.enum(['create', 'clone', 'refine', 'design-only', 'code-only', 'analyze-only']),
  input: z.object({
    prompt: z.string().optional(),
    url: z.string().url().optional(),
    options: z.record(z.any()).optional(),
  }),
  projectId: z.string(),
  priority: z.number().min(0).max(3).optional(),
});

// ============ ROUTER IMPLEMENTATION ============

export const agentRouter = router({
  // ============ QUEUE TASK ============
  queueTask: protectedProcedure
    .input(taskSchema)
    .mutation(async ({ input, ctx }) => {
      const redis = new Redis(process.env.REDIS_URL!);
      const queueManager = new QueueManager({ redis });

      try {
        const taskId = await queueManager.addTask({
          type: input.type as TaskType,
          projectId: ctx.organizationId, // Use org as project for direct tasks
          userId: ctx.user.id,
          organizationId: ctx.organizationId,
          priority: (input.priority || 2) as TaskPriority,
          input: input.input,
          context: {
            previousTasks: input.context?.previousTasks || [],
            userFeedback: input.context?.userFeedback,
            iterationCount: 0,
            maxIterations: 3,
          },
          maxRetries: 3,
          ttl: 3600,
        });

        await queueManager.close();
        await redis.quit();

        return {
          success: true,
          taskId,
          message: 'Task queued successfully',
        };

      } catch (error) {
        await queueManager.close();
        await redis.quit();
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to queue task',
        });
      }
    }),

  // ============ START WORKFLOW ============
  startWorkflow: protectedProcedure
    .input(workflowSchema)
    .mutation(async ({ input, ctx }) => {
      const redis = new Redis(process.env.REDIS_URL!);
      const coordinator = new AgentCoordinator(redis);

      try {
        const { workflowId, workflow } = await coordinator.startWorkflow(
          input.type as any,
          {
            prompt: input.input.prompt,
            url: input.input.url,
            options: input.input.options || {},
          },
          {
            projectId: input.projectId,
            userId: ctx.user.id,
            organizationId: ctx.organizationId,
            priority: (input.priority || 2) as TaskPriority,
            async: true,
          }
        );

        await coordinator.close();
        await redis.quit();

        return {
          success: true,
          workflowId,
          status: 'started',
        };

      } catch (error) {
        await coordinator.close();
        await redis.quit();
        throw error;
      }
    }),

  // ============ GET TASK STATUS ============
  getTask: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input, ctx }) => {
      const redis = new Redis(process.env.REDIS_URL!);
      const queueManager = new QueueManager({ redis });

      const task = await queueManager.getTask(input.taskId);
      
      await queueManager.close();
      await redis.quit();

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      // Verify ownership
      if (task.organizationId !== ctx.organizationId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        });
      }

      return task;
    }),

  // ============ GET WORKFLOW STATUS ============
  getWorkflow: protectedProcedure
    .input(z.object({ workflowId: z.string() }))
    .query(async ({ input, ctx }) => {
      const redis = new Redis(process.env.REDIS_URL!);
      const coordinator = new AgentCoordinator(redis);

      const workflow = await coordinator.getWorkflow(input.workflowId);
      
      await coordinator.close();
      await redis.quit();

      if (!workflow) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workflow not found',
        });
      }

      if (workflow.organizationId !== ctx.organizationId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        });
      }

      return workflow;
    }),

  // ============ CANCEL TASK ============
  cancelTask: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const redis = new Redis(process.env.REDIS_URL!);
      const queueManager = new QueueManager({ redis });

      const task = await queueManager.getTask(input.taskId);
      if (!task || task.organizationId !== ctx.organizationId) {
        await queueManager.close();
        await redis.quit();
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      const cancelled = await queueManager.cancelTask(input.taskId);
      
      await queueManager.close();
      await redis.quit();

      return { success: cancelled };
    }),

  // ============ RETRY TASK ============
  retryTask: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const redis = new Redis(process.env.REDIS_URL!);
      const queueManager = new QueueManager({ redis });

      const task = await queueManager.getTask(input.taskId);
      if (!task || task.organizationId !== ctx.organizationId) {
        await queueManager.close();
        await redis.quit();
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      const retried = await queueManager.retryTask(input.taskId);
      
      await queueManager.close();
      await redis.quit();

      return { success: retried };
    }),

  // ============ PAUSE WORKFLOW ============
  pauseWorkflow: protectedProcedure
    .input(z.object({ workflowId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const redis = new Redis(process.env.REDIS_URL!);
      const coordinator = new AgentCoordinator(redis);

      const workflow = await coordinator.getWorkflow(input.workflowId);
      if (!workflow || workflow.organizationId !== ctx.organizationId) {
        await coordinator.close();
        await redis.quit();
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workflow not found',
        });
      }

      const paused = await coordinator.pauseWorkflow(input.workflowId);
      
      await coordinator.close();
      await redis.quit();

      return { success: paused };
    }),

  // ============ RESUME WORKFLOW ============
  resumeWorkflow: protectedProcedure
    .input(z.object({ workflowId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const redis = new Redis(process.env.REDIS_URL!);
      const coordinator = new AgentCoordinator(redis);

      const workflow = await coordinator.getWorkflow(input.workflowId);
      if (!workflow || workflow.organizationId !== ctx.organizationId) {
        await coordinator.close();
        await redis.quit();
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workflow not found',
        });
      }

      const resumed = await coordinator.resumeWorkflow(input.workflowId);
      
      await coordinator.close();
      await redis.quit();

      return { success: resumed };
    }),

  // ============ GET QUEUE STATS ============
  getQueueStats: protectedProcedure
    .query(async ({ ctx }) => {
      const redis = new Redis(process.env.REDIS_URL!);
      const queueManager = new QueueManager({ redis });

      const stats = await queueManager.getQueueStats();
      
      await queueManager.close();
      await redis.quit();

      return { stats };
    }),

  // ============ LIST ORGANIZATION TASKS ============
  listTasks: protectedProcedure
    .input(z.object({
      status: z.enum(['pending', 'processing', 'complete', 'failed', 'retrying', 'cancelled']).optional(),
      type: z.enum(['ARCHITECT', 'DESIGN', 'CODE', 'ANALYZE', 'DEPLOY', 'EXPORT']).optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      const redis = new Redis(process.env.REDIS_URL!);
      const queueManager = new QueueManager({ redis });

      const tasks = await queueManager.getOrganizationTasks(ctx.organizationId, {
        status: input.status as any,
        type: input.type as TaskType,
        limit: input.limit,
        offset: input.offset,
      });
      
      await queueManager.close();
      await redis.quit();

      return { tasks };
    }),

  // ============ ADMIN: GET ALL QUEUE STATS ============
  adminQueueStats: adminProcedure
    .query(async () => {
      const redis = new Redis(process.env.REDIS_URL!);
      const queueManager = new QueueManager({ redis });

      const stats = await queueManager.getQueueStats();
      
      // Get additional metrics
      const [totalTasks, processingRate, errorRate] = await Promise.all([
        redis.get('plugspace:metrics:total_tasks'),
        redis.get('plugspace:metrics:processing_rate'),
        redis.get('plugspace:metrics:error_rate'),
      ]);

      await queueManager.close();
      await redis.quit();

      return {
        queues: stats,
        metrics: {
          totalTasks: parseInt(totalTasks || '0'),
          processingRate: parseFloat(processingRate || '0'),
          errorRate: parseFloat(errorRate || '0'),
        },
      };
    }),

  // ============ HEALTH CHECK ============
  health: protectedProcedure
    .query(async () => {
      const redis = new Redis(process.env.REDIS_URL!);
      
      const services = {
        redis: false,
        llm: false,
        queue: false,
      };

      try {
        // Check Redis
        await redis.ping();
        services.redis = true;

        // Check LLM service
        const llm = getLLMService(redis);
        services.llm = !!llm;

        // Check queue
        const queueManager = new QueueManager({ redis });
        const stats = await queueManager.getQueueStats();
        services.queue = stats.length > 0;
        await queueManager.close();

      } catch (error) {
        logger.error('Agent health check failed', { error });
      } finally {
        await redis.quit();
      }

      const healthy = Object.values(services).every(Boolean);

      return {
        status: healthy ? 'healthy' : 'degraded',
        services,
        timestamp: new Date().toISOString(),
      };
    }),
});

export default agentRouter;
