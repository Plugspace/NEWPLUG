// ==============================================
// PLUGSPACE.IO TITAN v1.4 - AUTH ROUTER
// ==============================================

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, authProcedure, protectedProcedure } from '../lib/trpc';
import { prisma, Role, SubscriptionTier } from '@plugspace/database';
import { verifyFirebaseToken, createFirebaseUser, revokeRefreshTokens } from '../lib/firebase';
import { deleteAllUserSessions } from '../lib/redis';
import { generateUniqueSlug, logActivity } from '@plugspace/database';
import { emailSchema } from '@plugspace/utils';

export const authRouter = router({
  // Register a new user
  register: authProcedure
    .input(
      z.object({
        firebaseUid: z.string(),
        email: emailSchema,
        displayName: z.string().min(1).max(100).optional(),
        photoURL: z.string().url().optional(),
        organizationName: z.string().min(1).max(100).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { firebaseUid: input.firebaseUid },
            { email: input.email },
          ],
        },
      });

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User already exists',
        });
      }

      // Create organization for the user
      const orgName = input.organizationName || `${input.displayName || input.email.split('@')[0]}'s Organization`;
      const orgSlug = await generateUniqueSlug(orgName, 'organization');

      const organization = await prisma.organization.create({
        data: {
          name: orgName,
          slug: orgSlug,
          billingEmail: input.email,
          tier: SubscriptionTier.FREE,
        },
      });

      // Create user
      const user = await prisma.user.create({
        data: {
          firebaseUid: input.firebaseUid,
          email: input.email,
          displayName: input.displayName,
          photoURL: input.photoURL,
          role: Role.USER,
          organizationId: organization.id,
          subscriptionTier: SubscriptionTier.FREE,
          creditsRemaining: 100,
        },
        include: { organization: true },
      });

      // Update organization user count
      await prisma.organization.update({
        where: { id: organization.id },
        data: { currentUsers: 1 },
      });

      // Log activity
      await logActivity({
        userId: user.id,
        userEmail: user.email,
        action: 'USER_REGISTERED',
        resource: 'user',
        resourceId: user.id,
        ip: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent'],
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          organizationId: user.organizationId,
        },
      };
    }),

  // Verify token and get current user
  me: protectedProcedure.query(async ({ ctx }) => {
    return {
      user: ctx.user,
      organization: ctx.organization,
    };
  }),

  // Update Firebase UID (for linking accounts)
  linkFirebaseAccount: protectedProcedure
    .input(
      z.object({
        newFirebaseUid: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: { firebaseUid: input.newFirebaseUid },
      });

      return { success: true };
    }),

  // Logout (revoke all sessions)
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    // Revoke Firebase tokens
    await revokeRefreshTokens(ctx.user.firebaseUid);

    // Delete all Redis sessions
    await deleteAllUserSessions(ctx.user.id);

    // Log activity
    await logActivity({
      userId: ctx.user.id,
      userEmail: ctx.user.email,
      action: 'USER_LOGOUT',
      ip: ctx.req.ip,
      userAgent: ctx.req.headers['user-agent'],
    });

    return { success: true };
  }),

  // Check if email is available
  checkEmail: authProcedure
    .input(z.object({ email: emailSchema }))
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });

      return { available: !user };
    }),

  // Verify Firebase token (for client-side validation)
  verifyToken: authProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const decoded = await verifyFirebaseToken(input.token);

      if (!decoded) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid token',
        });
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { firebaseUid: decoded.uid },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          organizationId: true,
        },
      });

      return {
        valid: true,
        decoded,
        userExists: !!user,
        user,
      };
    }),
});
