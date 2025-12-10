/**
 * Project router - CRUD operations with multi-tenant isolation
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc/trpc';
import { TRPCError } from '@trpc/server';
import { ProjectStatus } from '@plugspace/db';
import { generateSubdomain, isValidSubdomain } from '@plugspace/shared';
import { logger } from '../utils/logger';

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  subdomain: z.string().optional(),
});

const updateProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});

export const projectRouter = router({
  /**
   * List all projects for the authenticated user's organization
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const projects = await ctx.prisma.project.findMany({
      where: {
        organizationId: ctx.organizationId,
        deletedAt: null,
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    return projects;
  }),

  /**
   * Get a single project by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
          deletedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      return project;
    }),

  /**
   * Create a new project
   */
  create: protectedProcedure
    .input(createProjectSchema)
    .mutation(async ({ ctx, input }) => {
      // Check organization limits
      const org = await ctx.prisma.organization.findUnique({
        where: { id: ctx.organizationId },
      });

      if (!org) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found',
        });
      }

      if (org.maxProjects > 0 && org.currentProjects >= org.maxProjects) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Project limit reached for your subscription tier',
        });
      }

      // Generate subdomain if not provided
      let subdomain = input.subdomain || generateSubdomain(input.name);
      
      // Ensure subdomain is unique
      let counter = 1;
      while (await ctx.prisma.project.findUnique({ where: { subdomain } })) {
        subdomain = `${generateSubdomain(input.name)}-${counter}`;
        counter++;
      }

      if (!isValidSubdomain(subdomain)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid subdomain format',
        });
      }

      // Create project
      const project = await ctx.prisma.project.create({
        data: {
          name: input.name,
          description: input.description,
          subdomain,
          userId: ctx.userId,
          organizationId: ctx.organizationId,
          status: ProjectStatus.DRAFT,
        },
      });

      // Update organization project count
      await ctx.prisma.organization.update({
        where: { id: ctx.organizationId },
        data: { currentProjects: { increment: 1 } },
      });

      logger.info('Project created', {
        projectId: project.id,
        userId: ctx.userId,
        organizationId: ctx.organizationId,
      });

      return project;
    }),

  /**
   * Update a project
   */
  update: protectedProcedure
    .input(updateProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify project belongs to organization
      const existing = await ctx.prisma.project.findFirst({
        where: {
          id,
          organizationId: ctx.organizationId,
          deletedAt: null,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const project = await ctx.prisma.project.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      return project;
    }),

  /**
   * Delete a project (soft delete)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
          deletedAt: null,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      await ctx.prisma.project.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

      // Update organization project count
      await ctx.prisma.organization.update({
        where: { id: ctx.organizationId },
        data: { currentProjects: { decrement: 1 } },
      });

      return { success: true };
    }),

  /**
   * Publish a project
   */
  publish: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
          deletedAt: null,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      if (!project.codeFiles || !project.architecture) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Project must have architecture and code before publishing',
        });
      }

      const updated = await ctx.prisma.project.update({
        where: { id: input.id },
        data: {
          status: ProjectStatus.PUBLISHED,
          isPublished: true,
          publishedAt: new Date(),
          deploymentUrl: `https://${project.subdomain}.projects.plugspace.io`,
        },
      });

      return updated;
    }),
});
