// ==============================================
// PLUGSPACE.IO TITAN v1.4 - PRISMA CLIENT
// ==============================================

import { PrismaClient } from '../generated/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    errorFormat: 'pretty',
  });
};

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export type { PrismaClient } from '../generated/client';
export {
  Role,
  ProjectStatus,
  AgentName,
  SubscriptionTier,
} from '../generated/client';

// Re-export Prisma namespace for types
export { Prisma } from '../generated/client';

// Database connection helpers
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.info('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.info('✅ Database disconnected successfully');
  } catch (error) {
    console.error('❌ Database disconnection failed:', error);
    throw error;
  }
}

// Health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}
