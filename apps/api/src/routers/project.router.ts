// ==============================================
// PLUGSPACE.IO TITAN v1.4 - PROJECT ROUTER
// ==============================================
// Complete API for project management with
// full agent integration, streaming support,
// and comprehensive error handling
// ==============================================

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { observable } from '@trpc/server/observable';
import { Redis } from 'ioredis';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { AgentCoordinator, WorkflowType, WorkflowInput } from '../services/orchestration/coordinator';
import { SuggestionEngine, SuggestionContext } from '../services/suggestions/engine';
import { getLLMService } from '../services/llm/provider';
import { logger } from '../lib/logger';
import { prisma } from '../db';

// ============ INPUT SCHEMAS ============

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  prompt: z.string().min(10).max(5000),
  options: z.object({
    industry: z.string().optional(),
    style: z.string().optional(),
    targetAudience: z.string().optional(),
    brandColors: z.array(z.string()).optional(),
    referenceImage: z.string().optional(),
    includeTests: z.boolean().optional(),
    skipDesign: z.boolean().optional(),
    skipCode: z.boolean().optional(),
  }).optional(),
  workflowType: z.enum(['create', 'design-only', 'code-only']).optional(),
  async: z.boolean().optional(),
});

const cloneProjectSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  options: z.object({
    industry: z.string().optional(),
    style: z.string().optional(),
    includeCode: z.boolean().optional(),
  }).optional(),
});

const refineProjectSchema = z.object({
  projectId: z.string(),
  feedback: z.string().min(10).max(2000),
});

const deployProjectSchema = z.object({
  projectId: z.string(),
  environment: z.enum(['preview', 'staging', 'production']),
  domain: z.string().optional(),
});

const exportProjectSchema = z.object({
  projectId: z.string(),
  format: z.enum(['zip', 'tar', 'github']).optional(),
});

const listProjectsSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  status: z.enum(['active', 'archived', 'deleted']).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
});

// ============ ROUTER IMPLEMENTATION ============

export const projectRouter = router({
  // ============ CREATE PROJECT ============
  create: protectedProcedure
    .input(createProjectSchema)
    .mutation(async ({ input, ctx }) => {
      logger.info('Creating project', {
        userId: ctx.user.id,
        organizationId: ctx.organizationId,
        projectName: input.name,
      });

      // Check credits
      const credits = await checkCredits(ctx.organizationId);
      if (credits.remaining <= 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient credits. Please upgrade your plan.',
        });
      }

      // Create project record
      const project = await prisma.project.create({
        data: {
          name: input.name,
          description: input.prompt.slice(0, 200),
          status: 'GENERATING',
          organizationId: ctx.organizationId,
          createdById: ctx.user.id,
          metadata: {
            prompt: input.prompt,
            options: input.options,
            workflowType: input.workflowType || 'create',
          },
        },
      });

      try {
        // Initialize coordinator
        const redis = new Redis(process.env.REDIS_URL!);
        const coordinator = new AgentCoordinator(redis);

        // Start workflow
        const workflowType: WorkflowType = input.workflowType || 'create';
        const workflowInput: WorkflowInput = {
          prompt: input.prompt,
          options: input.options || {},
        };

        const { workflowId, workflow } = await coordinator.startWorkflow(
          workflowType,
          workflowInput,
          {
            projectId: project.id,
            userId: ctx.user.id,
            organizationId: ctx.organizationId,
            async: input.async,
          }
        );

        // Update project with workflow info
        await prisma.project.update({
          where: { id: project.id },
          data: {
            metadata: {
              ...project.metadata as object,
              workflowId,
            },
          },
        });

        // If sync, update with results
        if (workflow && workflow.output) {
          await prisma.project.update({
            where: { id: project.id },
            data: {
              status: 'ACTIVE',
              architecture: workflow.output.architecture as any,
              designSystem: workflow.output.design as any,
              generatedCode: workflow.output.code as any,
            },
          });

          // Deduct credits
          await deductCredits(ctx.organizationId, workflow.metrics.totalCost);
        }

        await redis.quit();

        return {
          success: true,
          project: {
            id: project.id,
            name: project.name,
            status: input.async ? 'GENERATING' : 'ACTIVE',
            workflowId,
          },
          workflow: workflow ? {
            id: workflowId,
            status: workflow.status,
            steps: workflow.steps,
            metrics: workflow.metrics,
            suggestions: workflow.suggestions.slice(0, 10),
          } : undefined,
        };

      } catch (error) {
        // Update project status on failure
        await prisma.project.update({
          where: { id: project.id },
          data: { status: 'FAILED' },
        });

        logger.error('Project creation failed', {
          projectId: project.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate project. Please try again.',
        });
      }
    }),

  // ============ STREAM PROJECT CREATION ============
  createStream: protectedProcedure
    .input(createProjectSchema)
    .subscription(async function* ({ input, ctx }) {
      const redis = new Redis(process.env.REDIS_URL!);
      const coordinator = new AgentCoordinator(redis);

      // Create project record
      const project = await prisma.project.create({
        data: {
          name: input.name,
          description: input.prompt.slice(0, 200),
          status: 'GENERATING',
          organizationId: ctx.organizationId,
          createdById: ctx.user.id,
          metadata: {
            prompt: input.prompt,
            options: input.options,
          },
        },
      });

      yield { type: 'project', data: { id: project.id, name: project.name } };

      try {
        const workflowInput: WorkflowInput = {
          prompt: input.prompt,
          options: input.options || {},
        };

        for await (const chunk of coordinator.streamWorkflow(
          (input.workflowType as WorkflowType) || 'create',
          workflowInput,
          {
            projectId: project.id,
            userId: ctx.user.id,
            organizationId: ctx.organizationId,
          }
        )) {
          yield chunk;
        }

        await prisma.project.update({
          where: { id: project.id },
          data: { status: 'ACTIVE' },
        });

      } catch (error) {
        await prisma.project.update({
          where: { id: project.id },
          data: { status: 'FAILED' },
        });

        yield {
          type: 'error',
          data: { message: error instanceof Error ? error.message : 'Generation failed' },
        };
      } finally {
        await redis.quit();
      }
    }),

  // ============ CLONE WEBSITE ============
  clone: protectedProcedure
    .input(cloneProjectSchema)
    .mutation(async ({ input, ctx }) => {
      logger.info('Cloning website', {
        userId: ctx.user.id,
        url: input.url,
      });

      const project = await prisma.project.create({
        data: {
          name: input.name,
          description: `Clone of ${input.url}`,
          status: 'GENERATING',
          organizationId: ctx.organizationId,
          createdById: ctx.user.id,
          metadata: {
            sourceUrl: input.url,
            options: input.options,
          },
        },
      });

      const redis = new Redis(process.env.REDIS_URL!);
      const coordinator = new AgentCoordinator(redis);

      try {
        const { workflowId, workflow } = await coordinator.startWorkflow(
          'clone',
          {
            url: input.url,
            options: input.options || {},
          },
          {
            projectId: project.id,
            userId: ctx.user.id,
            organizationId: ctx.organizationId,
          }
        );

        if (workflow && workflow.output) {
          await prisma.project.update({
            where: { id: project.id },
            data: {
              status: 'ACTIVE',
              architecture: workflow.output.architecture as any,
              designSystem: workflow.output.design as any,
              generatedCode: workflow.output.code as any,
              metadata: {
                ...project.metadata as object,
                analysis: workflow.output.analysis,
              },
            },
          });
        }

        await redis.quit();

        return {
          success: true,
          project: { id: project.id, name: project.name },
          workflowId,
          analysis: workflow?.output?.analysis,
        };

      } catch (error) {
        await prisma.project.update({
          where: { id: project.id },
          data: { status: 'FAILED' },
        });

        await redis.quit();

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to clone website. Please check the URL and try again.',
        });
      }
    }),

  // ============ REFINE PROJECT ============
  refine: protectedProcedure
    .input(refineProjectSchema)
    .mutation(async ({ input, ctx }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.projectId,
          organizationId: ctx.organizationId,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const redis = new Redis(process.env.REDIS_URL!);
      const coordinator = new AgentCoordinator(redis);

      try {
        const workflowId = (project.metadata as any)?.workflowId;
        if (!workflowId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Project cannot be refined',
          });
        }

        const refined = await coordinator.refineWorkflow(
          workflowId,
          input.feedback,
          {
            projectId: project.id,
            userId: ctx.user.id,
            organizationId: ctx.organizationId,
          }
        );

        // Update project with refined output
        if (refined.output) {
          await prisma.project.update({
            where: { id: project.id },
            data: {
              architecture: refined.output.architecture as any,
              designSystem: refined.output.design as any,
              generatedCode: refined.output.code as any,
              version: { increment: 1 },
            },
          });
        }

        await redis.quit();

        return {
          success: true,
          project: { id: project.id, version: project.version + 1 },
          workflow: {
            id: refined.id,
            suggestions: refined.suggestions.slice(0, 10),
          },
        };

      } catch (error) {
        await redis.quit();
        throw error;
      }
    }),

  // ============ GET PROJECT ============
  get: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.projectId,
          organizationId: ctx.organizationId,
        },
        include: {
          createdBy: {
            select: { id: true, displayName: true, photoURL: true },
          },
          InteractionLog: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      return {
        ...project,
        canEdit: project.createdById === ctx.user.id,
      };
    }),

  // ============ LIST PROJECTS ============
  list: protectedProcedure
    .input(listProjectsSchema)
    .query(async ({ input, ctx }) => {
      const { page, limit, status, sortBy, sortOrder, search } = input;
      const skip = (page - 1) * limit;

      const where: any = {
        organizationId: ctx.organizationId,
        deletedAt: null,
      };

      if (status) {
        where.status = status.toUpperCase();
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
          skip,
          take: limit,
          include: {
            createdBy: {
              select: { id: true, displayName: true, photoURL: true },
            },
          },
        }),
        prisma.project.count({ where }),
      ]);

      return {
        projects,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  // ============ DEPLOY PROJECT ============
  deploy: protectedProcedure
    .input(deployProjectSchema)
    .mutation(async ({ input, ctx }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.projectId,
          organizationId: ctx.organizationId,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      if (!project.generatedCode) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Project has no code to deploy',
        });
      }

      // Create deployment record
      const deployment = await prisma.deployment.create({
        data: {
          projectId: project.id,
          environment: input.environment.toUpperCase() as any,
          status: 'PENDING',
          version: project.version.toString(),
          deployedById: ctx.user.id,
        },
      });

      // Queue deployment task
      // In production, this would trigger actual deployment to Hostinger VPS

      return {
        success: true,
        deployment: {
          id: deployment.id,
          status: 'PENDING',
          environment: input.environment,
        },
      };
    }),

  // ============ EXPORT PROJECT ============
  export: protectedProcedure
    .input(exportProjectSchema)
    .mutation(async ({ input, ctx }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.projectId,
          organizationId: ctx.organizationId,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      if (!project.generatedCode) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Project has no code to export',
        });
      }

      // Generate export
      const redis = new Redis(process.env.REDIS_URL!);
      const AdmZip = require('adm-zip');
      const zip = new AdmZip();

      const code = project.generatedCode as any;
      if (code.files) {
        for (const file of code.files) {
          zip.addFile(file.path, Buffer.from(file.content, 'utf8'));
        }
      }

      const zipBuffer = zip.toBuffer();
      const exportId = `export_${Date.now()}`;

      // Store temporarily
      await redis.setex(`plugspace:export:${exportId}`, 3600, zipBuffer.toString('base64'));
      await redis.quit();

      return {
        success: true,
        export: {
          id: exportId,
          format: input.format || 'zip',
          downloadUrl: `/api/exports/${exportId}/download`,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        },
      };
    }),

  // ============ GET SUGGESTIONS ============
  getSuggestions: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      context: z.object({
        industry: z.string().optional(),
        goals: z.array(z.string()).optional(),
        competitors: z.array(z.string()).optional(),
      }).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.projectId,
          organizationId: ctx.organizationId,
        },
      });

      if (!project || !project.architecture) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found or has no architecture',
        });
      }

      const redis = new Redis(process.env.REDIS_URL!);
      const llm = getLLMService(redis);
      const suggestionEngine = new SuggestionEngine(llm, redis);

      const suggestions = await suggestionEngine.generateSuggestions(
        project.architecture as any,
        project.designSystem as any || null,
        {
          industry: input.context?.industry,
          goals: input.context?.goals,
          competitors: input.context?.competitors,
        }
      );

      await redis.quit();

      return { suggestions };
    }),

  // ============ GET INTERACTION LOGS ============
  getLogs: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      page: z.number().default(1),
      limit: z.number().default(50),
    }))
    .query(async ({ input, ctx }) => {
      const logs = await prisma.interactionLog.findMany({
        where: {
          projectId: input.projectId,
          project: {
            organizationId: ctx.organizationId,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      });

      return { logs };
    }),

  // ============ GET ANALYTICS ============
  analytics: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.projectId,
          organizationId: ctx.organizationId,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Aggregate interaction logs
      const logs = await prisma.interactionLog.findMany({
        where: { projectId: project.id },
      });

      const totalTokens = logs.reduce((sum, log) => 
        sum + (log.inputTokens || 0) + (log.outputTokens || 0), 0
      );

      const totalCost = logs.reduce((sum, log) => 
        sum + (log.estimatedCost || 0), 0
      );

      const avgLatency = logs.length > 0
        ? logs.reduce((sum, log) => sum + (log.latencyMs || 0), 0) / logs.length
        : 0;

      return {
        tokenUsage: {
          total: totalTokens,
          input: logs.reduce((sum, log) => sum + (log.inputTokens || 0), 0),
          output: logs.reduce((sum, log) => sum + (log.outputTokens || 0), 0),
        },
        cost: {
          total: totalCost,
          currency: 'USD',
        },
        performance: {
          avgLatencyMs: Math.round(avgLatency),
          totalInteractions: logs.length,
        },
        timeline: logs.slice(0, 10).map(log => ({
          agent: log.agentName,
          timestamp: log.createdAt,
          tokens: (log.inputTokens || 0) + (log.outputTokens || 0),
          latencyMs: log.latencyMs,
        })),
      };
    }),

  // ============ DELETE PROJECT ============
  delete: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.projectId,
          organizationId: ctx.organizationId,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Soft delete
      await prisma.project.update({
        where: { id: project.id },
        data: {
          deletedAt: new Date(),
          deletedById: ctx.user.id,
        },
      });

      return { success: true };
    }),
});

// ============ HELPER FUNCTIONS ============

async function checkCredits(organizationId: string): Promise<{ remaining: number }> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { usedCredits: true, limits: true },
  });

  if (!org) return { remaining: 0 };

  const limits = org.limits as any || {};
  const maxCredits = limits.aiCredits || 100;
  const remaining = maxCredits - (org.usedCredits || 0);

  return { remaining };
}

async function deductCredits(organizationId: string, amount: number): Promise<void> {
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      usedCredits: { increment: amount },
    },
  });
}

export default projectRouter;
