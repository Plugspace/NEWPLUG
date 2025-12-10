/**
 * Template router - Template marketplace operations
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc/trpc';

export const templateRouter = router({
  /**
   * List all templates with filtering
   */
  list: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
        featured: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(25),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};

      if (input.category && input.category !== 'All') {
        where.category = input.category;
      }

      if (input.featured !== undefined) {
        where.featured = input.featured;
      }

      const [templates, total] = await Promise.all([
        ctx.prisma.template.findMany({
          where,
          take: input.limit,
          skip: input.offset,
          orderBy: [
            { featured: 'desc' },
            { downloads: 'desc' },
            { createdAt: 'desc' },
          ],
        }),
        ctx.prisma.template.count({ where }),
      ]);

      return {
        templates,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  /**
   * Get template by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.prisma.template.findUnique({
        where: { id: input.id },
      });

      if (!template) {
        throw new Error('Template not found');
      }

      // Increment download count
      await ctx.prisma.template.update({
        where: { id: input.id },
        data: { downloads: { increment: 1 } },
      });

      return template;
    }),

  /**
   * Get template categories
   */
  categories: publicProcedure.query(async ({ ctx }) => {
    const categories = await ctx.prisma.template.groupBy({
      by: ['category'],
      _count: {
        id: true,
      },
    });

    return categories.map((c) => ({
      name: c.category,
      count: c._count.id,
    }));
  }),
});
