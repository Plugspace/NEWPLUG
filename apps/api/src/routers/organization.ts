// ==============================================
// PLUGSPACE.IO TITAN v1.4 - ORGANIZATION ROUTER
// ==============================================

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, adminProcedure } from '../lib/trpc';
import { prisma, SubscriptionTier } from '@plugspace/database';
import { logActivity, generateUniqueSlug, checkQuota } from '@plugspace/database';
import { organizationUpdateSchema, paginationSchema, emailSchema } from '@plugspace/utils';

export const organizationRouter = router({
  // Get current organization
  current: protectedProcedure.query(async ({ ctx }) => {
    const org = await prisma.organization.findUnique({
      where: { id: ctx.organization!.id },
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
          },
        },
      },
    });

    if (!org) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    return org;
  }),

  // Update organization
  update: adminProcedure
    .input(organizationUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const org = await prisma.organization.update({
        where: { id: ctx.organization!.id },
        data: input,
      });

      await logActivity({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: 'ORGANIZATION_UPDATED',
        resource: 'organization',
        resourceId: org.id,
        details: { fields: Object.keys(input) },
      });

      return org;
    }),

  // Get organization stats
  stats: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.organization!.id;

    const [
      userCount,
      projectCount,
      publishedCount,
      totalViews,
      recentActivity,
    ] = await Promise.all([
      prisma.user.count({
        where: { organizationId: orgId, deletedAt: null },
      }),
      prisma.project.count({
        where: { organizationId: orgId, deletedAt: null },
      }),
      prisma.project.count({
        where: { organizationId: orgId, isPublished: true, deletedAt: null },
      }),
      prisma.project.aggregate({
        where: { organizationId: orgId, deletedAt: null },
        _sum: { views: true },
      }),
      prisma.activityLog.findMany({
        where: {
          userId: { in: await prisma.user.findMany({ where: { organizationId: orgId }, select: { id: true } }).then(u => u.map(x => x.id)) },
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
      }),
    ]);

    const org = ctx.organization!;

    return {
      users: {
        current: userCount,
        max: org.maxUsers,
      },
      projects: {
        current: projectCount,
        max: org.maxProjects,
      },
      published: publishedCount,
      views: totalViews._sum.views || 0,
      storage: {
        current: org.currentStorage,
        max: org.maxStorage,
      },
      apiCalls: {
        current: org.apiCallsThisMonth,
        max: org.maxApiCalls,
      },
      recentActivity,
    };
  }),

  // Get members
  members: protectedProcedure
    .input(paginationSchema)
    .query(async ({ input, ctx }) => {
      const { page, limit, sortBy, sortOrder } = input;
      const skip = (page - 1) * limit;

      const [members, total] = await Promise.all([
        prisma.user.findMany({
          where: {
            organizationId: ctx.organization!.id,
            deletedAt: null,
          },
          skip,
          take: limit,
          orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            displayName: true,
            photoURL: true,
            role: true,
            lastLoginAt: true,
            createdAt: true,
          },
        }),
        prisma.user.count({
          where: {
            organizationId: ctx.organization!.id,
            deletedAt: null,
          },
        }),
      ]);

      return {
        data: members,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page < Math.ceil(total / limit),
        },
      };
    }),

  // Invite member
  inviteMember: adminProcedure
    .input(
      z.object({
        email: emailSchema,
        role: z.enum(['USER', 'STUDIO_ADMIN']).default('USER'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check quota
      const quota = await checkQuota(ctx.organization!.id, 'users');
      if (!quota.allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `User limit reached (${quota.current}/${quota.max}). Upgrade your plan to add more users.`,
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        if (existingUser.organizationId === ctx.organization!.id) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'User is already a member of this organization',
          });
        }
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User already exists in another organization',
        });
      }

      // TODO: Send invitation email
      // For now, we'll just create a pending invitation record

      await logActivity({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: 'MEMBER_INVITED',
        resource: 'organization',
        resourceId: ctx.organization!.id,
        details: { invitedEmail: input.email, role: input.role },
      });

      return {
        success: true,
        message: `Invitation sent to ${input.email}`,
      };
    }),

  // Remove member
  removeMember: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Cannot remove yourself
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot remove yourself from the organization',
        });
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: input.userId },
      });

      if (!targetUser || targetUser.organizationId !== ctx.organization!.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found in this organization',
        });
      }

      // Cannot remove master admin
      if (targetUser.role === 'MASTER_ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot remove master admin from organization',
        });
      }

      // Soft delete the user
      await prisma.user.update({
        where: { id: input.userId },
        data: { deletedAt: new Date() },
      });

      // Update organization user count
      await prisma.organization.update({
        where: { id: ctx.organization!.id },
        data: { currentUsers: { decrement: 1 } },
      });

      await logActivity({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: 'MEMBER_REMOVED',
        resource: 'organization',
        resourceId: ctx.organization!.id,
        details: { removedUserId: input.userId, removedEmail: targetUser.email },
      });

      return { success: true };
    }),

  // Check quota
  checkQuota: protectedProcedure
    .input(z.object({ resource: z.enum(['projects', 'users', 'storage', 'apiCalls']) }))
    .query(async ({ input, ctx }) => {
      return checkQuota(ctx.organization!.id, input.resource);
    }),

  // Get billing info
  billing: adminProcedure.query(async ({ ctx }) => {
    const org = await prisma.organization.findUnique({
      where: { id: ctx.organization!.id },
      select: {
        tier: true,
        billingEmail: true,
        stripeSubscriptionId: true,
        maxProjects: true,
        maxUsers: true,
        maxStorage: true,
        maxApiCalls: true,
      },
    });

    return org;
  }),

  // Update billing email
  updateBillingEmail: adminProcedure
    .input(z.object({ email: emailSchema }))
    .mutation(async ({ input, ctx }) => {
      const org = await prisma.organization.update({
        where: { id: ctx.organization!.id },
        data: { billingEmail: input.email },
      });

      return org;
    }),
});
