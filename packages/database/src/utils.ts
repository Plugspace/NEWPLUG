// ==============================================
// PLUGSPACE.IO TITAN v1.4 - DATABASE UTILITIES
// ==============================================

import { prisma, Prisma } from './client';

// ============ PAGINATION ============

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export function getPaginationParams(options: PaginationOptions) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 25));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function createPaginatedResult<T>(
  data: T[],
  total: number,
  options: PaginationOptions
): PaginatedResult<T> {
  const { page, limit } = getPaginationParams(options);
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

// ============ SOFT DELETE ============

export async function softDelete<T extends { deletedAt: Date | null }>(
  model: Prisma.ModelName,
  id: string
): Promise<T> {
  const modelDelegate = (prisma as Record<string, unknown>)[
    model.toLowerCase()
  ] as {
    update: (args: { where: { id: string }; data: { deletedAt: Date } }) => Promise<T>;
  };

  return modelDelegate.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export function excludeDeleted<T extends Record<string, unknown>>(
  where: T
): T & { deletedAt: null } {
  return { ...where, deletedAt: null };
}

// ============ ORGANIZATION CONTEXT ============

export interface OrganizationContext {
  organizationId: string;
  userId: string;
}

export function withOrganization<T extends Record<string, unknown>>(
  where: T,
  ctx: OrganizationContext
): T & { organizationId: string } {
  return { ...where, organizationId: ctx.organizationId };
}

// ============ TRANSACTION HELPERS ============

export type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export async function executeInTransaction<T>(
  fn: (tx: TransactionClient) => Promise<T>,
  options?: {
    maxWait?: number;
    timeout?: number;
    isolationLevel?: Prisma.TransactionIsolationLevel;
  }
): Promise<T> {
  return prisma.$transaction(fn, {
    maxWait: options?.maxWait ?? 5000,
    timeout: options?.timeout ?? 30000,
    isolationLevel: options?.isolationLevel,
  });
}

// ============ UNIQUE SLUG GENERATOR ============

export async function generateUniqueSlug(
  baseSlug: string,
  model: 'organization' | 'project',
  field: 'slug' | 'subdomain' = 'slug'
): Promise<string> {
  let slug = baseSlug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  let counter = 0;
  let uniqueSlug = slug;

  const modelDelegate = prisma[model] as {
    findFirst: (args: { where: Record<string, string> }) => Promise<unknown>;
  };

  while (true) {
    const existing = await modelDelegate.findFirst({
      where: { [field]: uniqueSlug },
    });

    if (!existing) {
      return uniqueSlug;
    }

    counter++;
    uniqueSlug = `${slug}-${counter}`;
  }
}

// ============ USAGE TRACKING ============

export async function incrementUsage(
  organizationId: string,
  field: 'currentProjects' | 'currentUsers' | 'currentStorage' | 'apiCallsThisMonth',
  amount: number = 1
): Promise<void> {
  await prisma.organization.update({
    where: { id: organizationId },
    data: { [field]: { increment: amount } },
  });
}

export async function decrementUsage(
  organizationId: string,
  field: 'currentProjects' | 'currentUsers' | 'currentStorage' | 'apiCallsThisMonth',
  amount: number = 1
): Promise<void> {
  await prisma.organization.update({
    where: { id: organizationId },
    data: { [field]: { decrement: amount } },
  });
}

export async function checkQuota(
  organizationId: string,
  resource: 'projects' | 'users' | 'storage' | 'apiCalls'
): Promise<{ allowed: boolean; current: number; max: number }> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      maxProjects: true,
      maxUsers: true,
      maxStorage: true,
      maxApiCalls: true,
      currentProjects: true,
      currentUsers: true,
      currentStorage: true,
      apiCallsThisMonth: true,
    },
  });

  if (!org) {
    throw new Error('Organization not found');
  }

  const resourceMap = {
    projects: { current: org.currentProjects, max: org.maxProjects },
    users: { current: org.currentUsers, max: org.maxUsers },
    storage: { current: org.currentStorage, max: org.maxStorage },
    apiCalls: { current: org.apiCallsThisMonth, max: org.maxApiCalls },
  };

  const { current, max } = resourceMap[resource];

  return {
    allowed: current < max,
    current,
    max,
  };
}

// ============ ACTIVITY LOGGING ============

export async function logActivity(params: {
  userId: string;
  userEmail: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  await prisma.activityLog.create({
    data: {
      userId: params.userId,
      userEmail: params.userEmail,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      details: params.details ?? {},
      ip: params.ip,
      userAgent: params.userAgent,
    },
  });
}

// ============ SEARCH HELPERS ============

export function createSearchFilter(
  searchTerm: string,
  fields: string[]
): Record<string, unknown> {
  if (!searchTerm || searchTerm.trim() === '') {
    return {};
  }

  return {
    OR: fields.map((field) => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive',
      },
    })),
  };
}

// ============ DATE HELPERS ============

export function getDateRange(period: 'day' | 'week' | 'month' | 'year'): {
  start: Date;
  end: Date;
} {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (period) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
}
