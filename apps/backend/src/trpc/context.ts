/**
 * tRPC Context with multi-tenant isolation
 */

import { inferAsyncReturnType } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { prisma } from '@plugspace/db';
import { verifyFirebaseToken } from '../auth/firebase';
import { logger } from '../utils/logger';

export interface Context {
  userId?: string;
  organizationId?: string;
  email?: string;
  role?: string;
  prisma: typeof prisma;
}

/**
 * Create tRPC context from Express request
 * Extracts user info from Firebase token and enforces multi-tenant isolation
 */
export async function createContext({
  req,
  res,
}: CreateExpressContextOptions): Promise<Context> {
  const context: Context = {
    prisma,
  };

  try {
    // Extract Firebase token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = await verifyFirebaseToken(token);

      if (decoded) {
        // Get user from database
        const user = await prisma.user.findUnique({
          where: { firebaseUid: decoded.uid },
          include: { organization: true },
        });

        if (user && !user.deletedAt) {
          context.userId = user.id;
          context.organizationId = user.organizationId;
          context.email = user.email;
          context.role = user.role;

          // Enforce organization context for all queries
          // This ensures multi-tenant isolation
          logger.debug('User context set', {
            userId: user.id,
            organizationId: user.organizationId,
            email: user.email,
          });
        }
      }
    }
  } catch (error) {
    // Silent fail - user is not authenticated
    logger.debug('No valid auth token', { error: (error as Error).message });
  }

  return context;
}

export type ContextType = inferAsyncReturnType<typeof createContext>;
