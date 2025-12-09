// ==============================================
// PLUGSPACE.IO TITAN v1.4 - TEMPLATE ROUTER
// ==============================================

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, procedure, protectedProcedure, masterAdminProcedure } from '../lib/trpc';
import { prisma } from '@plugspace/database';
import { paginationSchema } from '@plugspace/utils';
import { TEMPLATE_CATEGORIES } from '@plugspace/utils';

export const templateRouter = router({
  // List templates (public)
  list: procedure
    .input(
      paginationSchema.extend({
        category: z.string().optional(),
        search: z.string().optional(),
        featured: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      const { page, limit, sortBy, sortOrder, category, search, featured } = input;
      const skip = (page - 1) * limit;

      const where = {
        ...(category && { category }),
        ...(featured !== undefined && { featured }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { category: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [templates, total] = await Promise.all([
        prisma.template.findMany({
          where,
          skip,
          take: limit,
          orderBy: sortBy
            ? { [sortBy]: sortOrder }
            : featured
              ? { downloads: 'desc' }
              : { createdAt: 'desc' },
        }),
        prisma.template.count({ where }),
      ]);

      return {
        data: templates,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page < Math.ceil(total / limit),
        },
      };
    }),

  // Get single template (public)
  get: procedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const template = await prisma.template.findUnique({
        where: { id: input.id },
      });

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        });
      }

      return template;
    }),

  // Get categories (public)
  categories: procedure.query(async () => {
    // Get counts for each category
    const categoryCounts = await prisma.template.groupBy({
      by: ['category'],
      _count: { id: true },
    });

    const countMap = new Map(
      categoryCounts.map((c) => [c.category, c._count.id])
    );

    return TEMPLATE_CATEGORIES.map((cat) => ({
      ...cat,
      count: countMap.get(cat.id) || 0,
    }));
  }),

  // Get featured templates (public)
  featured: procedure
    .input(z.object({ limit: z.number().min(1).max(20).default(6) }))
    .query(async ({ input }) => {
      const templates = await prisma.template.findMany({
        where: { featured: true },
        orderBy: { downloads: 'desc' },
        take: input.limit,
      });

      return templates;
    }),

  // Get popular templates (public)
  popular: procedure
    .input(z.object({ limit: z.number().min(1).max(20).default(12) }))
    .query(async ({ input }) => {
      const templates = await prisma.template.findMany({
        orderBy: { downloads: 'desc' },
        take: input.limit,
      });

      return templates;
    }),

  // Use template (protected)
  use: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const template = await prisma.template.findUnique({
        where: { id: input.id },
      });

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        });
      }

      // Increment downloads
      await prisma.template.update({
        where: { id: input.id },
        data: { downloads: { increment: 1 } },
      });

      return template;
    }),

  // Rate template (protected)
  rate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        rating: z.number().min(1).max(5),
      })
    )
    .mutation(async ({ input }) => {
      const template = await prisma.template.findUnique({
        where: { id: input.id },
      });

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        });
      }

      // Calculate new rating (simple average)
      const newReviews = template.reviews + 1;
      const newRating =
        (template.rating * template.reviews + input.rating) / newReviews;

      await prisma.template.update({
        where: { id: input.id },
        data: {
          rating: newRating,
          reviews: newReviews,
        },
      });

      return { success: true, newRating };
    }),

  // Admin: Create template
  create: masterAdminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        category: z.string(),
        type: z.string(),
        templateData: z.record(z.unknown()),
        featured: z.boolean().default(false),
        previewImage: z.string().url().optional(),
        thumbnailImage: z.string().url().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const template = await prisma.template.create({
        data: input,
      });

      return template;
    }),

  // Admin: Update template
  update: masterAdminProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().min(1).max(100).optional(),
          category: z.string().optional(),
          type: z.string().optional(),
          templateData: z.record(z.unknown()).optional(),
          featured: z.boolean().optional(),
          previewImage: z.string().url().optional().nullable(),
          thumbnailImage: z.string().url().optional().nullable(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const template = await prisma.template.update({
        where: { id: input.id },
        data: input.data,
      });

      return template;
    }),

  // Admin: Delete template
  delete: masterAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.template.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Admin: Set featured
  setFeatured: masterAdminProcedure
    .input(
      z.object({
        id: z.string(),
        featured: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const template = await prisma.template.update({
        where: { id: input.id },
        data: { featured: input.featured },
      });

      return template;
    }),
});
