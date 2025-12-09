/**
 * Admin router - Master admin dashboard operations
 * Restricted to plugspaceapp@gmail.com
 */

import { z } from 'zod';
import { router, masterAdminProcedure } from '../trpc/trpc';
import { TRPCError } from '@trpc/server';

export const adminRouter = router({
  /**
   * Get dashboard statistics
   */
  stats: masterAdminProcedure.query(async ({ ctx }) => {
    const [totalUsers, totalProjects, totalOrganizations, totalInteractions] =
      await Promise.all([
        ctx.prisma.user.count({ where: { deletedAt: null } }),
        ctx.prisma.project.count({ where: { deletedAt: null } }),
        ctx.prisma.organization.count(),
        ctx.prisma.interactionLog.count(),
      ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentInteractions = await ctx.prisma.interactionLog.findMany({
      where: {
        timestamp: { gte: sevenDaysAgo },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    // Calculate revenue (placeholder - integrate with Stripe)
    const revenue = 0;

    return {
      totalUsers,
      totalProjects,
      totalOrganizations,
      totalInteractions,
      revenue,
      recentInteractions,
    };
  }),

  /**
   * List all users
   */
  listUsers: masterAdminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = { deletedAt: null };

      if (input.search) {
        where.OR = [
          { email: { contains: input.search, mode: 'insensitive' } },
          { displayName: { contains: input.search, mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        ctx.prisma.user.findMany({
          where,
          take: input.limit,
          skip: input.offset,
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                tier: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        ctx.prisma.user.count({ where }),
      ]);

      return {
        users,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  /**
   * Update user
   */
  updateUser: masterAdminProcedure
    .input(
      z.object({
        id: z.string(),
        role: z.enum(['USER', 'STUDIO_ADMIN', 'MASTER_ADMIN']).optional(),
        subscriptionTier: z.enum(['FREE', 'PRO', 'ENTERPRISE']).optional(),
        creditsRemaining: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const user = await ctx.prisma.user.update({
        where: { id },
        data,
      });

      return user;
    }),

  /**
   * Delete user (soft delete)
   */
  deleteUser: masterAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

      return { success: true };
    }),

  /**
   * Get system configuration
   */
  getSystemConfig: masterAdminProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const config = await ctx.prisma.systemConfig.findUnique({
        where: { key: input.key },
      });

      return config;
    }),

  /**
   * Update system configuration
   */
  updateSystemConfig: masterAdminProcedure
    .input(
      z.object({
        key: z.string(),
        value: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const config = await ctx.prisma.systemConfig.upsert({
        where: { key: input.key },
        update: { value: input.value },
        create: {
          key: input.key,
          value: input.value,
        },
      });

      return config;
    }),

  /**
   * Toggle kill switch
   */
  toggleKillSwitch: masterAdminProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const config = await ctx.prisma.systemConfig.upsert({
        where: { key: 'kill_switch' },
        update: { value: { enabled: input.enabled } },
        create: {
          key: 'kill_switch',
          value: { enabled: input.enabled },
        },
      });

      return config;
    }),
});
