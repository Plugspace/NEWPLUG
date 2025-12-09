// ==============================================
// PLUGSPACE.IO TITAN v1.4 - DATABASE MIDDLEWARE
// ==============================================

import { prisma, Prisma } from './client';

// ============ MULTI-TENANT MIDDLEWARE ============

export interface TenantContext {
  organizationId: string;
  userId: string;
  bypassTenantCheck?: boolean;
}

// Models that require multi-tenant isolation
const TENANT_MODELS = ['User', 'Project', 'InteractionLog', 'Theme', 'ApiKey', 'Webhook'];

// Models that are organization-scoped
const ORG_SCOPED_MODELS = ['User', 'Project', 'InteractionLog', 'Theme', 'ApiKey', 'Webhook'];

/**
 * Apply multi-tenant middleware to Prisma client
 * This ensures all queries are scoped to the correct organization
 */
export function applyTenantMiddleware(ctx: TenantContext): void {
  prisma.$use(async (params, next) => {
    // Skip if bypass flag is set (for admin operations)
    if (ctx.bypassTenantCheck) {
      return next(params);
    }

    const model = params.model;
    if (!model || !ORG_SCOPED_MODELS.includes(model)) {
      return next(params);
    }

    // Inject organizationId into queries
    if (params.action === 'findUnique' || params.action === 'findFirst') {
      params.args.where = {
        ...params.args.where,
        organizationId: ctx.organizationId,
      };
    }

    if (params.action === 'findMany') {
      params.args.where = {
        ...params.args.where,
        organizationId: ctx.organizationId,
      };
    }

    if (params.action === 'create') {
      params.args.data = {
        ...params.args.data,
        organizationId: ctx.organizationId,
      };
    }

    if (params.action === 'createMany') {
      if (Array.isArray(params.args.data)) {
        params.args.data = params.args.data.map(
          (item: Record<string, unknown>) => ({
            ...item,
            organizationId: ctx.organizationId,
          })
        );
      }
    }

    if (params.action === 'update' || params.action === 'delete') {
      params.args.where = {
        ...params.args.where,
        organizationId: ctx.organizationId,
      };
    }

    if (params.action === 'updateMany' || params.action === 'deleteMany') {
      params.args.where = {
        ...params.args.where,
        organizationId: ctx.organizationId,
      };
    }

    return next(params);
  });
}

// ============ SOFT DELETE MIDDLEWARE ============

const SOFT_DELETE_MODELS = ['User', 'Project'];

/**
 * Apply soft delete middleware
 * Automatically filters out soft-deleted records
 */
export function applySoftDeleteMiddleware(): void {
  prisma.$use(async (params, next) => {
    const model = params.model;
    if (!model || !SOFT_DELETE_MODELS.includes(model)) {
      return next(params);
    }

    // Find operations - exclude deleted
    if (params.action === 'findUnique' || params.action === 'findFirst') {
      params.args.where = {
        ...params.args.where,
        deletedAt: null,
      };
    }

    if (params.action === 'findMany') {
      params.args.where = {
        ...params.args.where,
        deletedAt: null,
      };
    }

    // Convert delete to soft delete
    if (params.action === 'delete') {
      params.action = 'update';
      params.args.data = { deletedAt: new Date() };
    }

    if (params.action === 'deleteMany') {
      params.action = 'updateMany';
      params.args.data = { deletedAt: new Date() };
    }

    return next(params);
  });
}

// ============ LOGGING MIDDLEWARE ============

export interface QueryLog {
  model: string | undefined;
  action: string;
  params: unknown;
  duration: number;
  timestamp: Date;
}

let queryLogs: QueryLog[] = [];
const MAX_QUERY_LOGS = 1000;

/**
 * Apply query logging middleware
 * Useful for debugging and performance monitoring
 */
export function applyLoggingMiddleware(
  options: { verbose?: boolean } = {}
): void {
  prisma.$use(async (params, next) => {
    const start = performance.now();
    const result = await next(params);
    const duration = performance.now() - start;

    const log: QueryLog = {
      model: params.model,
      action: params.action,
      params: options.verbose ? params.args : undefined,
      duration,
      timestamp: new Date(),
    };

    queryLogs.push(log);
    if (queryLogs.length > MAX_QUERY_LOGS) {
      queryLogs = queryLogs.slice(-MAX_QUERY_LOGS);
    }

    if (duration > 1000) {
      console.warn(
        `⚠️ Slow query detected: ${params.model}.${params.action} took ${duration.toFixed(2)}ms`
      );
    }

    return result;
  });
}

export function getQueryLogs(): QueryLog[] {
  return [...queryLogs];
}

export function clearQueryLogs(): void {
  queryLogs = [];
}

// ============ RATE LIMITING MIDDLEWARE ============

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Apply rate limiting middleware
 * Limits the number of queries per organization
 */
export function applyRateLimitMiddleware(
  options: { maxRequests?: number; windowMs?: number } = {}
): void {
  const maxRequests = options.maxRequests ?? 1000;
  const windowMs = options.windowMs ?? 60000; // 1 minute

  prisma.$use(async (params, next) => {
    // Get organization ID from params if available
    const orgId =
      (params.args?.where as Record<string, string> | undefined)
        ?.organizationId ||
      (params.args?.data as Record<string, string> | undefined)?.organizationId;

    if (!orgId) {
      return next(params);
    }

    const now = Date.now();
    const key = `rate:${orgId}`;
    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      rateLimitStore.set(key, entry);
    }

    entry.count++;

    if (entry.count > maxRequests) {
      throw new Error(
        `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs}ms`
      );
    }

    return next(params);
  });
}

// ============ AUDIT MIDDLEWARE ============

export interface AuditEntry {
  action: 'create' | 'update' | 'delete';
  model: string;
  recordId: string;
  userId?: string;
  changes?: Record<string, unknown>;
  timestamp: Date;
}

let auditLog: AuditEntry[] = [];
const MAX_AUDIT_ENTRIES = 10000;

/**
 * Apply audit middleware
 * Records all create, update, and delete operations
 */
export function applyAuditMiddleware(
  options: { userId?: string } = {}
): void {
  const AUDIT_ACTIONS = ['create', 'update', 'delete'];

  prisma.$use(async (params, next) => {
    const result = await next(params);

    if (!params.model || !AUDIT_ACTIONS.includes(params.action)) {
      return result;
    }

    const entry: AuditEntry = {
      action: params.action as 'create' | 'update' | 'delete',
      model: params.model,
      recordId: (result as { id?: string })?.id ?? 'unknown',
      userId: options.userId,
      changes:
        params.action === 'update'
          ? (params.args?.data as Record<string, unknown>)
          : undefined,
      timestamp: new Date(),
    };

    auditLog.push(entry);
    if (auditLog.length > MAX_AUDIT_ENTRIES) {
      auditLog = auditLog.slice(-MAX_AUDIT_ENTRIES);
    }

    return result;
  });
}

export function getAuditLog(): AuditEntry[] {
  return [...auditLog];
}

export function clearAuditLog(): void {
  auditLog = [];
}

// ============ VALIDATION MIDDLEWARE ============

type ValidationRule = (
  params: Prisma.MiddlewareParams
) => void | Promise<void>;

const validationRules: Map<string, ValidationRule[]> = new Map();

/**
 * Register a validation rule for a model
 */
export function registerValidationRule(
  model: string,
  rule: ValidationRule
): void {
  const rules = validationRules.get(model) ?? [];
  rules.push(rule);
  validationRules.set(model, rules);
}

/**
 * Apply validation middleware
 * Runs custom validation rules before operations
 */
export function applyValidationMiddleware(): void {
  prisma.$use(async (params, next) => {
    if (!params.model) {
      return next(params);
    }

    const rules = validationRules.get(params.model) ?? [];
    for (const rule of rules) {
      await rule(params);
    }

    return next(params);
  });
}

// ============ ENCRYPTION MIDDLEWARE ============

// Fields that should be encrypted at rest
const ENCRYPTED_FIELDS: Record<string, string[]> = {
  User: ['mfaSecret'],
  ApiKey: ['hashedKey'],
  Webhook: ['secret'],
};

/**
 * Apply encryption middleware
 * Encrypts sensitive fields before storage and decrypts on retrieval
 */
export function applyEncryptionMiddleware(
  encryptFn: (value: string) => string,
  decryptFn: (value: string) => string
): void {
  prisma.$use(async (params, next) => {
    const model = params.model;
    if (!model || !ENCRYPTED_FIELDS[model]) {
      return next(params);
    }

    const fields = ENCRYPTED_FIELDS[model];

    // Encrypt on create/update
    if (params.action === 'create' || params.action === 'update') {
      const data = params.args.data as Record<string, unknown>;
      if (data) {
        for (const field of fields) {
          if (typeof data[field] === 'string') {
            data[field] = encryptFn(data[field] as string);
          }
        }
      }
    }

    const result = await next(params);

    // Decrypt on read
    if (
      result &&
      (params.action === 'findUnique' ||
        params.action === 'findFirst' ||
        params.action === 'findMany')
    ) {
      const decryptRecord = (record: Record<string, unknown>) => {
        for (const field of fields) {
          if (typeof record[field] === 'string') {
            record[field] = decryptFn(record[field] as string);
          }
        }
      };

      if (Array.isArray(result)) {
        result.forEach(decryptRecord);
      } else if (typeof result === 'object') {
        decryptRecord(result as Record<string, unknown>);
      }
    }

    return result;
  });
}
