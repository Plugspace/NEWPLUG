/**
 * User router - User management operations
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc/trpc';
import { TRPCError } from '@trpc/server';

export const userRouter = router({
  /**
   * Get current user profile
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            tier: true,
            maxProjects: true,
            maxUsers: true,
            currentProjects: true,
            currentUsers: true,
          },
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

  /**
   * Update user profile
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        displayName: z.string().max(100).optional(),
        firstName: z.string().max(50).optional(),
        lastName: z.string().max(50).optional(),
        phone: z.string().max(20).optional(),
        bio: z.string().max(500).optional(),
        timezone: z.string().optional(),
        language: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.update({
        where: { id: ctx.userId },
        data: input,
      });

      return user;
    }),
});
