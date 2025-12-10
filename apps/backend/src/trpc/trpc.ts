/**
 * tRPC instance with middleware for multi-tenant isolation
 */

import { initTRPC, TRPCError } from '@trpc/server';
import { ContextType } from './context';
import { logger } from '../utils/logger';

const t = initTRPC.context<ContextType>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        code: error.code,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Middleware: Require authentication
 */
const requireAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.userId || !ctx.organizationId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be authenticated to access this resource',
    });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      email: ctx.email!,
      role: ctx.role!,
    },
  });
});

/**
 * Middleware: Require master admin role
 */
const requireMasterAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.userId || !ctx.organizationId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  if (ctx.role !== 'MASTER_ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Master admin access required',
    });
  }

  // Master admin must use specific email
  if (ctx.email !== 'plugspaceapp@gmail.com') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Master admin access restricted to plugspaceapp@gmail.com',
    });
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      email: ctx.email!,
      role: ctx.role!,
    },
  });
});

/**
 * Middleware: Multi-tenant isolation
 * Automatically injects organizationId into all queries
 */
const withOrganization = t.middleware(({ ctx, next }) => {
  if (!ctx.organizationId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Organization context required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      organizationId: ctx.organizationId,
    },
  });
});

/**
 * Protected procedures
 */
export const protectedProcedure = publicProcedure
  .use(requireAuth)
  .use(withOrganization);

export const masterAdminProcedure = publicProcedure
  .use(requireMasterAdmin)
  .use(withOrganization);
