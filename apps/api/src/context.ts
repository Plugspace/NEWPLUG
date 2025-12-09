// ==============================================
// PLUGSPACE.IO TITAN v1.4 - tRPC CONTEXT
// ==============================================

import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { prisma, Role } from '@plugspace/database';
import { verifyFirebaseToken } from './lib/firebase';
import type { User, Organization } from '@plugspace/types';

export interface Context {
  req: CreateExpressContextOptions['req'];
  res: CreateExpressContextOptions['res'];
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isMasterAdmin: boolean;
  prisma: typeof prisma;
}

export async function createContext({
  req,
  res,
}: CreateExpressContextOptions): Promise<Context> {
  let user: User | null = null;
  let organization: Organization | null = null;
  let isAuthenticated = false;
  let isMasterAdmin = false;

  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (token) {
    try {
      // Verify Firebase token
      const decodedToken = await verifyFirebaseToken(token);

      if (decodedToken) {
        // Get user from database
        const dbUser = await prisma.user.findUnique({
          where: { firebaseUid: decodedToken.uid },
          include: { organization: true },
        });

        if (dbUser && !dbUser.deletedAt) {
          // Check if account is locked
          if (dbUser.lockedUntil && new Date() < dbUser.lockedUntil) {
            // Account is locked, don't authenticate
          } else {
            user = {
              id: dbUser.id,
              firebaseUid: dbUser.firebaseUid,
              email: dbUser.email,
              displayName: dbUser.displayName ?? undefined,
              photoURL: dbUser.photoURL ?? undefined,
              role: dbUser.role as Role,
              firstName: dbUser.firstName ?? undefined,
              lastName: dbUser.lastName ?? undefined,
              phone: dbUser.phone ?? undefined,
              bio: dbUser.bio ?? undefined,
              timezone: dbUser.timezone,
              language: dbUser.language,
              mfaEnabled: dbUser.mfaEnabled,
              lastLoginAt: dbUser.lastLoginAt ?? undefined,
              lastLoginIP: dbUser.lastLoginIP ?? undefined,
              loginAttempts: dbUser.loginAttempts,
              lockedUntil: dbUser.lockedUntil ?? undefined,
              organizationId: dbUser.organizationId,
              stripeCustomerId: dbUser.stripeCustomerId ?? undefined,
              subscriptionTier: dbUser.subscriptionTier as 'FREE' | 'PRO' | 'ENTERPRISE',
              creditsRemaining: dbUser.creditsRemaining,
              createdAt: dbUser.createdAt,
              updatedAt: dbUser.updatedAt,
              deletedAt: dbUser.deletedAt ?? undefined,
            };

            organization = {
              id: dbUser.organization.id,
              name: dbUser.organization.name,
              slug: dbUser.organization.slug,
              domain: dbUser.organization.domain ?? undefined,
              logo: dbUser.organization.logo ?? undefined,
              tier: dbUser.organization.tier as 'FREE' | 'PRO' | 'ENTERPRISE',
              billingEmail: dbUser.organization.billingEmail,
              stripeSubscriptionId: dbUser.organization.stripeSubscriptionId ?? undefined,
              maxProjects: dbUser.organization.maxProjects,
              maxUsers: dbUser.organization.maxUsers,
              maxStorage: dbUser.organization.maxStorage,
              maxApiCalls: dbUser.organization.maxApiCalls,
              currentProjects: dbUser.organization.currentProjects,
              currentUsers: dbUser.organization.currentUsers,
              currentStorage: dbUser.organization.currentStorage,
              apiCallsThisMonth: dbUser.organization.apiCallsThisMonth,
              allowedDomains: dbUser.organization.allowedDomains,
              ssoEnabled: dbUser.organization.ssoEnabled,
              createdAt: dbUser.organization.createdAt,
              updatedAt: dbUser.organization.updatedAt,
            };

            isAuthenticated = true;
            isMasterAdmin = dbUser.role === Role.MASTER_ADMIN;

            // Update last login
            await prisma.user.update({
              where: { id: dbUser.id },
              data: {
                lastLoginAt: new Date(),
                lastLoginIP: req.ip || req.socket.remoteAddress,
                loginAttempts: 0,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      // Invalid token, continue without authentication
    }
  }

  return {
    req,
    res,
    user,
    organization,
    isAuthenticated,
    isMasterAdmin,
    prisma,
  };
}

export type ContextType = Awaited<ReturnType<typeof createContext>>;
