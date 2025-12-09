// ==============================================
// PLUGSPACE.IO TITAN v1.4 - USER ROUTER
// ==============================================

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, adminProcedure } from '../lib/trpc';
import { prisma, Role } from '@plugspace/database';
import { logActivity } from '@plugspace/database';
import { userUpdateSchema, paginationSchema, emailSchema } from '@plugspace/utils';

export const userRouter = router({
  // Get current user profile
  profile: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            tier: true,
          },
        },
        _count: {
          select: { projects: true },
        },
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return user;
  }),

  // Update user profile
  update: protectedProcedure
    .input(userUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await prisma.user.update({
        where: { id: ctx.user.id },
        data: input,
      });

      await logActivity({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: 'USER_UPDATED',
        resource: 'user',
        resourceId: ctx.user.id,
        details: { fields: Object.keys(input) },
      });

      return user;
    }),

  // Update user settings
  updateSettings: protectedProcedure
    .input(
      z.object({
        timezone: z.string().optional(),
        language: z.string().length(2).optional(),
        mfaEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await prisma.user.update({
        where: { id: ctx.user.id },
        data: input,
      });

      return user;
    }),

  // Get user's projects
  projects: protectedProcedure
    .input(paginationSchema)
    .query(async ({ input, ctx }) => {
      const { page, limit, sortBy, sortOrder } = input;
      const skip = (page - 1) * limit;

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where: {
            userId: ctx.user.id,
            organizationId: ctx.organization!.id,
            deletedAt: null,
          },
          skip,
          take: limit,
          orderBy: sortBy ? { [sortBy]: sortOrder } : { updatedAt: 'desc' },
          select: {
            id: true,
            name: true,
            description: true,
            subdomain: true,
            status: true,
            isPublished: true,
            publishedAt: true,
            views: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.project.count({
          where: {
            userId: ctx.user.id,
            organizationId: ctx.organization!.id,
            deletedAt: null,
          },
        }),
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

  // Get user's activity
  activity: protectedProcedure
    .input(paginationSchema)
    .query(async ({ input, ctx }) => {
      const { page, limit } = input;
      const skip = (page - 1) * limit;

      const [activities, total] = await Promise.all([
        prisma.activityLog.findMany({
          where: { userId: ctx.user.id },
          skip,
          take: limit,
          orderBy: { timestamp: 'desc' },
        }),
        prisma.activityLog.count({
          where: { userId: ctx.user.id },
        }),
      ]);

      return {
        data: activities,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page < Math.ceil(total / limit),
        },
      };
    }),

  // Get usage stats
  usage: protectedProcedure.query(async ({ ctx }) => {
    const org = ctx.organization!;

    const projectCount = await prisma.project.count({
      where: {
        userId: ctx.user.id,
        organizationId: org.id,
        deletedAt: null,
      },
    });

    const publishedCount = await prisma.project.count({
      where: {
        userId: ctx.user.id,
        organizationId: org.id,
        isPublished: true,
        deletedAt: null,
      },
    });

    const interactionCount = await prisma.interactionLog.count({
      where: { userId: ctx.user.id },
    });

    return {
      projects: {
        current: projectCount,
        max: org.maxProjects,
      },
      published: publishedCount,
      apiCalls: {
        current: org.apiCallsThisMonth,
        max: org.maxApiCalls,
      },
      storage: {
        current: org.currentStorage,
        max: org.maxStorage,
      },
      credits: ctx.user.creditsRemaining,
      interactions: interactionCount,
    };
  }),

  // Delete account (soft delete)
  delete: protectedProcedure
    .input(
      z.object({
        confirmation: z.literal('DELETE MY ACCOUNT'),
      })
    )
    .mutation(async ({ ctx }) => {
      // Soft delete user
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: { deletedAt: new Date() },
      });

      // Soft delete all user's projects
      await prisma.project.updateMany({
        where: { userId: ctx.user.id },
        data: { deletedAt: new Date() },
      });

      await logActivity({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: 'USER_DELETED',
        resource: 'user',
        resourceId: ctx.user.id,
      });

      return { success: true };
    }),

  // Admin: List all users in organization
  list: adminProcedure
    .input(
      paginationSchema.extend({
        search: z.string().optional(),
        role: z.nativeEnum(Role).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { page, limit, sortBy, sortOrder, search, role } = input;
      const skip = (page - 1) * limit;

      const where = {
        organizationId: ctx.organization!.id,
        deletedAt: null,
        ...(search && {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { displayName: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
        ...(role && { role }),
      };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            displayName: true,
            photoURL: true,
            role: true,
            subscriptionTier: true,
            lastLoginAt: true,
            createdAt: true,
            _count: {
              select: { projects: true },
            },
          },
        }),
        prisma.user.count({ where }),
      ]);

      return {
        data: users,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page < Math.ceil(total / limit),
        },
      };
    }),

  // Admin: Update user role
  updateRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.nativeEnum(Role),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Cannot change master admin's role
      const targetUser = await prisma.user.findUnique({
        where: { id: input.userId },
      });

      if (!targetUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      if (targetUser.role === Role.MASTER_ADMIN) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot change master admin role',
        });
      }

      // Only master admin can create new admins
      if (input.role === Role.MASTER_ADMIN && ctx.user.role !== Role.MASTER_ADMIN) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only master admin can assign master admin role',
        });
      }

      const user = await prisma.user.update({
        where: { id: input.userId },
        data: { role: input.role },
      });

      await logActivity({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: 'USER_ROLE_UPDATED',
        resource: 'user',
        resourceId: input.userId,
        details: { newRole: input.role },
      });

      return user;
    }),
});
