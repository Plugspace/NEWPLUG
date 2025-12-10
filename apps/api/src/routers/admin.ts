// ==============================================
// PLUGSPACE.IO TITAN v1.4 - ADMIN ROUTER
// ==============================================

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, masterAdminProcedure, adminProcedure } from '../lib/trpc';
import { prisma, Role, SubscriptionTier, ProjectStatus } from '@plugspace/database';
import { logActivity } from '@plugspace/database';
import { paginationSchema, MASTER_ADMIN_EMAIL } from '@plugspace/utils';
import { setCache, getCache, deleteCache } from '../lib/redis';

export const adminRouter = router({
  // Get dashboard stats
  stats: masterAdminProcedure.query(async () => {
    const [
      totalUsers,
      activeUsers,
      totalProjects,
      publishedProjects,
      totalOrgs,
      totalInteractions,
      recentUsers,
      recentProjects,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({
        where: {
          deletedAt: null,
          lastLoginAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
      prisma.project.count({ where: { deletedAt: null } }),
      prisma.project.count({ where: { isPublished: true, deletedAt: null } }),
      prisma.organization.count(),
      prisma.interactionLog.count(),
      prisma.user.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          email: true,
          displayName: true,
          createdAt: true,
        },
      }),
      prisma.project.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          subdomain: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    // Calculate growth (compare to last month)
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const [usersLastMonth, projectsLastMonth] = await Promise.all([
      prisma.user.count({
        where: { createdAt: { lt: lastMonth }, deletedAt: null },
      }),
      prisma.project.count({
        where: { createdAt: { lt: lastMonth }, deletedAt: null },
      }),
    ]);

    const userGrowth = usersLastMonth > 0
      ? ((totalUsers - usersLastMonth) / usersLastMonth) * 100
      : 100;
    const projectGrowth = projectsLastMonth > 0
      ? ((totalProjects - projectsLastMonth) / projectsLastMonth) * 100
      : 100;

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        growth: userGrowth,
      },
      projects: {
        total: totalProjects,
        published: publishedProjects,
        growth: projectGrowth,
      },
      organizations: totalOrgs,
      interactions: totalInteractions,
      recentUsers,
      recentProjects,
    };
  }),

  // Get analytics data
  analytics: masterAdminProcedure
    .input(
      z.object({
        period: z.enum(['day', 'week', 'month', 'year']).default('month'),
      })
    )
    .query(async ({ input }) => {
      const now = new Date();
      let startDate: Date;

      switch (input.period) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
      }

      // Get daily signups
      const signups = await prisma.user.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: startDate },
          deletedAt: null,
        },
        _count: true,
      });

      // Get daily projects created
      const projectsCreated = await prisma.project.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: startDate },
          deletedAt: null,
        },
        _count: true,
      });

      // Get AI usage
      const aiUsage = await prisma.interactionLog.groupBy({
        by: ['agentName'],
        where: {
          timestamp: { gte: startDate },
        },
        _count: true,
        _sum: {
          tokensUsed: true,
          cost: true,
        },
      });

      return {
        period: input.period,
        startDate,
        endDate: now,
        signups: signups.length,
        projectsCreated: projectsCreated.length,
        aiUsage: aiUsage.map((a) => ({
          agent: a.agentName,
          count: a._count,
          tokens: a._sum.tokensUsed || 0,
          cost: a._sum.cost || 0,
        })),
      };
    }),

  // List all users
  users: masterAdminProcedure
    .input(
      paginationSchema.extend({
        search: z.string().optional(),
        role: z.nativeEnum(Role).optional(),
        tier: z.nativeEnum(SubscriptionTier).optional(),
      })
    )
    .query(async ({ input }) => {
      const { page, limit, sortBy, sortOrder, search, role, tier } = input;
      const skip = (page - 1) * limit;

      const where = {
        deletedAt: null,
        ...(search && {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { displayName: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
        ...(role && { role }),
        ...(tier && { subscriptionTier: tier }),
      };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
          include: {
            organization: {
              select: { name: true, slug: true },
            },
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

  // Update user
  updateUser: masterAdminProcedure
    .input(
      z.object({
        userId: z.string(),
        data: z.object({
          role: z.nativeEnum(Role).optional(),
          subscriptionTier: z.nativeEnum(SubscriptionTier).optional(),
          creditsRemaining: z.number().optional(),
          lockedUntil: z.date().nullable().optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Cannot modify master admin
      if (user.email === MASTER_ADMIN_EMAIL && ctx.user.email !== MASTER_ADMIN_EMAIL) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot modify master admin account',
        });
      }

      const updated = await prisma.user.update({
        where: { id: input.userId },
        data: input.data,
      });

      await logActivity({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: 'ADMIN_USER_UPDATED',
        resource: 'user',
        resourceId: input.userId,
        details: { changes: Object.keys(input.data) },
      });

      return updated;
    }),

  // Delete user
  deleteUser: masterAdminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      if (user.email === MASTER_ADMIN_EMAIL) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot delete master admin account',
        });
      }

      await prisma.user.update({
        where: { id: input.userId },
        data: { deletedAt: new Date() },
      });

      await logActivity({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: 'ADMIN_USER_DELETED',
        resource: 'user',
        resourceId: input.userId,
      });

      return { success: true };
    }),

  // List all projects
  projects: masterAdminProcedure
    .input(
      paginationSchema.extend({
        search: z.string().optional(),
        status: z.nativeEnum(ProjectStatus).optional(),
      })
    )
    .query(async ({ input }) => {
      const { page, limit, sortBy, sortOrder, search, status } = input;
      const skip = (page - 1) * limit;

      const where = {
        deletedAt: null,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { subdomain: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
        ...(status && { status }),
      };

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          skip,
          take: limit,
          orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
          include: {
            user: {
              select: { email: true, displayName: true },
            },
            organization: {
              select: { name: true },
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

  // Activity log
  activityLog: masterAdminProcedure
    .input(
      paginationSchema.extend({
        action: z.string().optional(),
        userId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { page, limit, action, userId } = input;
      const skip = (page - 1) * limit;

      const where = {
        ...(action && { action }),
        ...(userId && { userId }),
      };

      const [logs, total] = await Promise.all([
        prisma.activityLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { timestamp: 'desc' },
        }),
        prisma.activityLog.count({ where }),
      ]);

      return {
        data: logs,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page < Math.ceil(total / limit),
        },
      };
    }),

  // System config
  getConfig: masterAdminProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const config = await prisma.systemConfig.findUnique({
        where: { key: input.key },
      });

      return config?.value || null;
    }),

  setConfig: masterAdminProcedure
    .input(
      z.object({
        key: z.string(),
        value: z.record(z.unknown()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const config = await prisma.systemConfig.upsert({
        where: { key: input.key },
        update: { value: input.value },
        create: { key: input.key, value: input.value },
      });

      await logActivity({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: 'CONFIG_UPDATED',
        resource: 'system_config',
        resourceId: input.key,
      });

      return config;
    }),

  // Kill switch
  killSwitch: masterAdminProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await prisma.systemConfig.upsert({
        where: { key: 'maintenance_mode' },
        update: {
          value: {
            enabled: input.enabled,
            message: input.message || 'System is under maintenance. Please try again later.',
            enabledAt: input.enabled ? new Date().toISOString() : null,
            enabledBy: input.enabled ? ctx.user.email : null,
          },
        },
        create: {
          key: 'maintenance_mode',
          value: {
            enabled: input.enabled,
            message: input.message || '',
          },
        },
      });

      // Also set in Redis for fast access
      await setCache('maintenance_mode', {
        enabled: input.enabled,
        message: input.message,
      });

      await logActivity({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: input.enabled ? 'KILL_SWITCH_ENABLED' : 'KILL_SWITCH_DISABLED',
        details: { message: input.message },
      });

      return { success: true, enabled: input.enabled };
    }),

  // Get maintenance status
  maintenanceStatus: masterAdminProcedure.query(async () => {
    // Try Redis first
    const cached = await getCache<{ enabled: boolean; message: string }>('maintenance_mode');
    if (cached) return cached;

    // Fall back to database
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'maintenance_mode' },
    });

    return (config?.value as { enabled: boolean; message: string }) || { enabled: false, message: '' };
  }),

  // Theme management
  themes: masterAdminProcedure
    .input(paginationSchema)
    .query(async ({ input }) => {
      const { page, limit, sortBy, sortOrder } = input;
      const skip = (page - 1) * limit;

      const [themes, total] = await Promise.all([
        prisma.theme.findMany({
          skip,
          take: limit,
          orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
        }),
        prisma.theme.count(),
      ]);

      return {
        data: themes,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page < Math.ceil(total / limit),
        },
      };
    }),

  createTheme: masterAdminProcedure
    .input(
      z.object({
        name: z.string(),
        method: z.enum(['AI Prompt', 'Website Clone', 'Image Analysis', 'HTML Extraction']),
        colors: z.array(z.string()),
        typography: z.record(z.unknown()),
        components: z.record(z.unknown()),
        industry: z.string().optional(),
        style: z.string().optional(),
        sourceUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const theme = await prisma.theme.create({
        data: {
          ...input,
          organizationId: ctx.organization.id,
        },
      });

      return theme;
    }),

  // Health check
  health: masterAdminProcedure.query(async () => {
    const checks = {
      database: false,
      redis: false,
    };

    // Check database
    try {
      await prisma.$runCommandRaw({ ping: 1 });
      checks.database = true;
    } catch {
      checks.database = false;
    }

    // Check Redis
    try {
      const { redis } = await import('../lib/redis');
      await redis.ping();
      checks.redis = true;
    } catch {
      checks.redis = false;
    }

    const allHealthy = Object.values(checks).every(Boolean);

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    };
  }),
});
