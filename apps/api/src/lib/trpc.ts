// ==============================================
// PLUGSPACE.IO TITAN v1.4 - tRPC SETUP
// ==============================================

import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import type { Context } from '../context';
import { checkRateLimit } from './redis';
import { RATE_LIMITS, MASTER_ADMIN_EMAIL } from '@plugspace/utils';
import { Role } from '@plugspace/database';

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
export const mergeRouters = t.mergeRouters;

// ============ LOGGING MIDDLEWARE ============

const loggerMiddleware = middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;

  if (result.ok) {
    console.info(`✅ ${type} ${path} - ${duration}ms`);
  } else {
    console.error(`❌ ${type} ${path} - ${duration}ms`);
  }

  return result;
});

// ============ RATE LIMIT MIDDLEWARE ============

const rateLimitMiddleware = (config: { maxRequests: number; windowMs: number }) =>
  middleware(async ({ ctx, next }) => {
    const key = ctx.user?.id || ctx.req.ip || 'anonymous';
    const { allowed, remaining, resetAt } = await checkRateLimit(
      key,
      config.maxRequests,
      config.windowMs / 1000
    );

    // Set rate limit headers
    ctx.res.setHeader('X-RateLimit-Limit', config.maxRequests);
    ctx.res.setHeader('X-RateLimit-Remaining', remaining);
    ctx.res.setHeader('X-RateLimit-Reset', resetAt);

    if (!allowed) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Rate limit exceeded. Try again after ${new Date(resetAt).toISOString()}`,
      });
    }

    return next();
  });

// ============ AUTH MIDDLEWARE ============

const isAuthenticated = middleware(async ({ ctx, next }) => {
  if (!ctx.isAuthenticated || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      organization: ctx.organization!,
    },
  });
});

// ============ ADMIN MIDDLEWARE ============

const isAdmin = middleware(async ({ ctx, next }) => {
  if (!ctx.isAuthenticated || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  if (ctx.user.role !== Role.STUDIO_ADMIN && ctx.user.role !== Role.MASTER_ADMIN) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have permission to access this resource',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      organization: ctx.organization!,
    },
  });
});

// ============ MASTER ADMIN MIDDLEWARE ============

const isMasterAdmin = middleware(async ({ ctx, next }) => {
  if (!ctx.isAuthenticated || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  if (ctx.user.role !== Role.MASTER_ADMIN || ctx.user.email !== MASTER_ADMIN_EMAIL) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Only the master admin can access this resource',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      organization: ctx.organization!,
    },
  });
});

// ============ ORGANIZATION MIDDLEWARE ============

const hasOrganization = middleware(async ({ ctx, next }) => {
  if (!ctx.organization) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You must belong to an organization to access this resource',
    });
  }

  return next({
    ctx: {
      ...ctx,
      organization: ctx.organization,
    },
  });
});

// ============ PROCEDURE TYPES ============

// Public procedure with logging and default rate limiting
export const procedure = publicProcedure
  .use(loggerMiddleware)
  .use(rateLimitMiddleware(RATE_LIMITS.DEFAULT));

// Authenticated procedure
export const protectedProcedure = procedure.use(isAuthenticated);

// Admin procedure (studio admin or master admin)
export const adminProcedure = procedure.use(isAdmin);

// Master admin only procedure
export const masterAdminProcedure = procedure.use(isMasterAdmin);

// Organization-scoped procedure
export const orgProcedure = protectedProcedure.use(hasOrganization);

// AI procedure with stricter rate limiting
export const aiProcedure = protectedProcedure.use(
  rateLimitMiddleware(RATE_LIMITS.AI)
);

// Auth procedure with stricter rate limiting
export const authProcedure = publicProcedure
  .use(loggerMiddleware)
  .use(rateLimitMiddleware(RATE_LIMITS.AUTH));
