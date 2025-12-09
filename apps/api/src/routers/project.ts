// ==============================================
// PLUGSPACE.IO TITAN v1.4 - PROJECT ROUTER
// ==============================================

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, orgProcedure } from '../lib/trpc';
import { prisma, ProjectStatus } from '@plugspace/database';
import { logActivity, generateUniqueSlug, checkQuota, incrementUsage, decrementUsage } from '@plugspace/database';
import { projectCreateSchema, projectUpdateSchema, paginationSchema, publishConfigSchema } from '@plugspace/utils';

export const projectRouter = router({
  // Create new project
  create: orgProcedure
    .input(projectCreateSchema)
    .mutation(async ({ input, ctx }) => {
      // Check quota
      const quota = await checkQuota(ctx.organization.id, 'projects');
      if (!quota.allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Project limit reached (${quota.current}/${quota.max}). Upgrade your plan to create more projects.`,
        });
      }

      // Generate unique subdomain
      const subdomain = await generateUniqueSlug(input.subdomain, 'project', 'subdomain');

      // Get template if provided
      let templateData = null;
      if (input.templateId) {
        const template = await prisma.template.findUnique({
          where: { id: input.templateId },
        });
        if (template) {
          templateData = template.templateData;
          // Increment template downloads
          await prisma.template.update({
            where: { id: input.templateId },
            data: { downloads: { increment: 1 } },
          });
        }
      }

      const project = await prisma.project.create({
        data: {
          name: input.name,
          description: input.description,
          subdomain,
          userId: ctx.user.id,
          organizationId: ctx.organization.id,
          status: ProjectStatus.DRAFT,
          ...(templateData && { design: templateData }),
        },
      });

      // Increment organization project count
      await incrementUsage(ctx.organization.id, 'currentProjects');

      await logActivity({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: 'PROJECT_CREATED',
        resource: 'project',
        resourceId: project.id,
        details: { name: project.name, subdomain: project.subdomain },
      });

      return project;
    }),

  // Get single project
  get: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organization.id,
          deletedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
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

  // List projects
  list: orgProcedure
    .input(
      paginationSchema.extend({
        status: z.nativeEnum(ProjectStatus).optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { page, limit, sortBy, sortOrder, status, search } = input;
      const skip = (page - 1) * limit;

      const where = {
        organizationId: ctx.organization.id,
        deletedAt: null,
        ...(status && { status }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
            { subdomain: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          skip,
          take: limit,
          orderBy: sortBy ? { [sortBy]: sortOrder } : { updatedAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
        }),
        prisma.project.count({ where }),
      ]);

      return {
        data: projects,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page < Math.ceil(total / limit),
        },
      };
    }),

  // Update project
  update: orgProcedure
    .input(
      z.object({
        id: z.string(),
        data: projectUpdateSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organization.id,
          deletedAt: null,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Check if user owns the project or is admin
      if (project.userId !== ctx.user.id && ctx.user.role === 'USER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this project',
        });
      }

      const updated = await prisma.project.update({
        where: { id: input.id },
        data: input.data,
      });

      await logActivity({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: 'PROJECT_UPDATED',
        resource: 'project',
        resourceId: project.id,
        details: { fields: Object.keys(input.data) },
      });

      return updated;
    }),

  // Save project content (architecture, design, code)
  saveContent: orgProcedure
    .input(
      z.object({
        id: z.string(),
        architecture: z.record(z.unknown()).optional(),
        design: z.record(z.unknown()).optional(),
        codeFiles: z.record(z.string()).optional(),
        dependencies: z.record(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organization.id,
          deletedAt: null,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Save previous version before updating
      const previousVersion = {
        version: project.version,
        timestamp: new Date(),
        changes: 'Auto-save',
        codeSnapshot: project.codeFiles || {},
      };

      const updated = await prisma.project.update({
        where: { id: input.id },
        data: {
          ...(input.architecture && { architecture: input.architecture }),
          ...(input.design && { design: input.design }),
          ...(input.codeFiles && { codeFiles: input.codeFiles }),
          ...(input.dependencies && { dependencies: input.dependencies }),
          version: { increment: 1 },
          previousVersions: {
            push: previousVersion,
          },
        },
      });

      return updated;
    }),

  // Publish project
  publish: orgProcedure
    .input(
      z.object({
        id: z.string(),
        config: publishConfigSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organization.id,
          deletedAt: null,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Check if custom domain is allowed
      if (input.config.customDomain && ctx.organization.tier === 'FREE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Custom domains require a Pro or Enterprise subscription',
        });
      }

      // TODO: Implement actual deployment to Hostinger
      const deploymentUrl = `https://${project.subdomain}.projects.plugspace.io`;

      const updated = await prisma.project.update({
        where: { id: input.id },
        data: {
          status: ProjectStatus.PUBLISHED,
          isPublished: true,
          publishedAt: new Date(),
          deploymentUrl,
          sslEnabled: input.config.sslEnabled,
          cdnEnabled: input.config.cdnEnabled,
          customDomain: input.config.customDomain,
        },
      });

      await logActivity({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: 'PROJECT_PUBLISHED',
        resource: 'project',
        resourceId: project.id,
        details: { url: deploymentUrl },
      });

      return {
        success: true,
        url: deploymentUrl,
        project: updated,
      };
    }),

  // Unpublish project
  unpublish: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organization.id,
          deletedAt: null,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const updated = await prisma.project.update({
        where: { id: input.id },
        data: {
          status: ProjectStatus.DRAFT,
          isPublished: false,
        },
      });

      await logActivity({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: 'PROJECT_UNPUBLISHED',
        resource: 'project',
        resourceId: project.id,
      });

      return updated;
    }),

  // Delete project (soft delete)
  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organization.id,
          deletedAt: null,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Check if user owns the project or is admin
      if (project.userId !== ctx.user.id && ctx.user.role === 'USER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this project',
        });
      }

      await prisma.project.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

      // Decrement organization project count
      await decrementUsage(ctx.organization.id, 'currentProjects');

      await logActivity({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: 'PROJECT_DELETED',
        resource: 'project',
        resourceId: project.id,
      });

      return { success: true };
    }),

  // Duplicate project
  duplicate: orgProcedure
    .input(
      z.object({
        id: z.string(),
        newName: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check quota
      const quota = await checkQuota(ctx.organization.id, 'projects');
      if (!quota.allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Project limit reached (${quota.current}/${quota.max})`,
        });
      }

      const original = await prisma.project.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organization.id,
          deletedAt: null,
        },
      });

      if (!original) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const subdomain = await generateUniqueSlug(input.newName, 'project', 'subdomain');

      const duplicate = await prisma.project.create({
        data: {
          name: input.newName,
          description: original.description,
          subdomain,
          userId: ctx.user.id,
          organizationId: ctx.organization.id,
          status: ProjectStatus.DRAFT,
          architecture: original.architecture || undefined,
          design: original.design || undefined,
          codeFiles: original.codeFiles || undefined,
          dependencies: original.dependencies || undefined,
          clonedFrom: original.id,
        },
      });

      await incrementUsage(ctx.organization.id, 'currentProjects');

      await logActivity({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: 'PROJECT_DUPLICATED',
        resource: 'project',
        resourceId: duplicate.id,
        details: { originalId: original.id },
      });

      return duplicate;
    }),

  // Get project versions
  versions: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organization.id,
          deletedAt: null,
        },
        select: {
          version: true,
          previousVersions: true,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      return {
        currentVersion: project.version,
        versions: project.previousVersions,
      };
    }),
});
