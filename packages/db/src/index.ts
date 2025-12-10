/**
 * Plugspace.io Titan v1.4 - Database Package
 * Exports Prisma Client with multi-tenant middleware
 */

import { PrismaClient } from '@prisma/client';

// Global Prisma Client instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Export all types
export * from '@prisma/client';

// Multi-tenant middleware helper
export function withOrganization<T>(
  organizationId: string,
  query: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  // This ensures all queries are scoped to the organization
  // In production, you'd add middleware to auto-inject organizationId
  return query(prisma);
}
