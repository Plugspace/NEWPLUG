// ==============================================
// PLUGSPACE.IO TITAN v1.4 - DATABASE UTILITIES
// ==============================================

import { prisma } from './client';

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
  }
): Promise<T> {
  return prisma.$transaction(fn, {
    maxWait: options?.maxWait ?? 5000,
    timeout: options?.timeout ?? 30000,
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

  while (true) {
    let existing: unknown = null;
    
    if (model === 'organization') {
      existing = await prisma.organization.findFirst({
        where: { [field]: uniqueSlug } as any,
      });
    } else {
      existing = await prisma.project.findFirst({
        where: { [field]: uniqueSlug } as any,
      });
    }

    if (!existing) {
      return uniqueSlug;
    }

    counter++;
    uniqueSlug = `${slug}-${counter}`;
  }
}

// ============ USAGE TRACKING ============

interface OrgLimits {
  projects: number;
  users: number;
  storage: number;
  apiCalls: number;
  aiCredits: number;
}

interface OrgUsage {
  projects: number;
  users: number;
  storage: number;
  apiCallsThisMonth: number;
  aiCreditsUsed: number;
}

function parseJsonField<T>(field: unknown, defaultValue: T): T {
  if (typeof field === 'string') {
    try {
      return JSON.parse(field) as T;
    } catch {
      return defaultValue;
    }
  }
  return (field as T) || defaultValue;
}

export async function checkQuota(
  organizationId: string,
  resource: 'projects' | 'users' | 'storage' | 'apiCalls'
): Promise<{ allowed: boolean; current: number; max: number }> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      limits: true,
      usage: true,
    },
  });

  if (!org) {
    throw new Error('Organization not found');
  }

  const defaultLimits: OrgLimits = { projects: 5, users: 3, storage: 1073741824, apiCalls: 1000, aiCredits: 100 };
  const defaultUsage: OrgUsage = { projects: 0, users: 0, storage: 0, apiCallsThisMonth: 0, aiCreditsUsed: 0 };

  const limits = parseJsonField<OrgLimits>(org.limits, defaultLimits);
  const usage = parseJsonField<OrgUsage>(org.usage, defaultUsage);

  const resourceMap = {
    projects: { current: usage.projects, max: limits.projects },
    users: { current: usage.users, max: limits.users },
    storage: { current: usage.storage, max: limits.storage },
    apiCalls: { current: usage.apiCallsThisMonth, max: limits.apiCalls },
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
  details?: object;
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
      details: params.details,
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
