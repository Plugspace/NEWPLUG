/**
 * Theme router - Theme generation and management
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc/trpc';
import { TRPCError } from '@trpc/server';

export const themeRouter = router({
  /**
   * List themes for organization
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const themes = await ctx.prisma.theme.findMany({
      where: {
        organizationId: ctx.organizationId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return themes;
  }),

  /**
   * Create theme from AI prompt
   */
  createFromPrompt: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        prompt: z.string().min(10).max(1000),
        industry: z.string().optional(),
        style: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // This will be implemented with Agent Jessica
      // For now, return placeholder
      const theme = await ctx.prisma.theme.create({
        data: {
          name: input.name,
          organizationId: ctx.organizationId,
          method: 'AI Prompt',
          colors: [],
          typography: {},
          components: {},
          industry: input.industry,
          style: input.style,
        },
      });

      return theme;
    }),

  /**
   * Create theme from website clone
   */
  createFromClone: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        url: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // This will be implemented with Agent Sherlock
      const theme = await ctx.prisma.theme.create({
        data: {
          name: input.name,
          organizationId: ctx.organizationId,
          method: 'Website Clone',
          sourceUrl: input.url,
          colors: [],
          typography: {},
          components: {},
        },
      });

      return theme;
    }),

  /**
   * Set active theme
   */
  setActive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Deactivate all other themes
      await ctx.prisma.theme.updateMany({
        where: {
          organizationId: ctx.organizationId,
          id: { not: input.id },
        },
        data: { isActive: false },
      });

      // Activate selected theme
      const theme = await ctx.prisma.theme.update({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
        data: { isActive: true },
      });

      return theme;
    }),
});
