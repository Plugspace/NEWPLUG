// ==============================================
// PLUGSPACE.IO TITAN v1.4 - ENTERPRISE ERROR SYSTEM
// ==============================================

import { ZodError } from 'zod';

// ============ ERROR CODES ============

export const ErrorCodes = {
  // Authentication Errors (1xxx)
  UNAUTHORIZED: 'AUTH_001',
  INVALID_TOKEN: 'AUTH_002',
  TOKEN_EXPIRED: 'AUTH_003',
  INVALID_CREDENTIALS: 'AUTH_004',
  MFA_REQUIRED: 'AUTH_005',
  ACCOUNT_LOCKED: 'AUTH_006',
  SESSION_EXPIRED: 'AUTH_007',
  EMAIL_NOT_VERIFIED: 'AUTH_008',
  PHONE_NOT_VERIFIED: 'AUTH_009',
  SSO_REQUIRED: 'AUTH_010',

  // Authorization Errors (2xxx)
  FORBIDDEN: 'AUTHZ_001',
  INSUFFICIENT_PERMISSIONS: 'AUTHZ_002',
  ROLE_REQUIRED: 'AUTHZ_003',
  ORGANIZATION_ACCESS_DENIED: 'AUTHZ_004',
  RESOURCE_ACCESS_DENIED: 'AUTHZ_005',
  FEATURE_NOT_AVAILABLE: 'AUTHZ_006',
  SUBSCRIPTION_REQUIRED: 'AUTHZ_007',

  // Validation Errors (3xxx)
  VALIDATION_ERROR: 'VAL_001',
  INVALID_INPUT: 'VAL_002',
  MISSING_REQUIRED_FIELD: 'VAL_003',
  INVALID_FORMAT: 'VAL_004',
  OUT_OF_RANGE: 'VAL_005',
  DUPLICATE_VALUE: 'VAL_006',
  INVALID_STATE_TRANSITION: 'VAL_007',

  // Resource Errors (4xxx)
  NOT_FOUND: 'RES_001',
  ALREADY_EXISTS: 'RES_002',
  CONFLICT: 'RES_003',
  GONE: 'RES_004',
  RESOURCE_LOCKED: 'RES_005',
  RESOURCE_EXPIRED: 'RES_006',

  // Rate Limiting Errors (5xxx)
  RATE_LIMITED: 'RATE_001',
  QUOTA_EXCEEDED: 'RATE_002',
  TOO_MANY_REQUESTS: 'RATE_003',
  CONCURRENT_LIMIT_REACHED: 'RATE_004',

  // Server Errors (6xxx)
  INTERNAL_ERROR: 'SRV_001',
  SERVICE_UNAVAILABLE: 'SRV_002',
  DATABASE_ERROR: 'SRV_003',
  EXTERNAL_SERVICE_ERROR: 'SRV_004',
  TIMEOUT: 'SRV_005',
  CIRCUIT_BREAKER_OPEN: 'SRV_006',
  MAINTENANCE_MODE: 'SRV_007',
  DEPENDENCY_FAILURE: 'SRV_008',

  // AI/Agent Errors (7xxx)
  AI_ERROR: 'AI_001',
  MODEL_UNAVAILABLE: 'AI_002',
  CONTEXT_TOO_LONG: 'AI_003',
  GENERATION_FAILED: 'AI_004',
  VOICE_RECOGNITION_FAILED: 'AI_005',
  CONTENT_FILTERED: 'AI_006',
  TOKEN_LIMIT_EXCEEDED: 'AI_007',

  // File/Upload Errors (8xxx)
  FILE_TOO_LARGE: 'FILE_001',
  INVALID_FILE_TYPE: 'FILE_002',
  UPLOAD_FAILED: 'FILE_003',
  STORAGE_FULL: 'FILE_004',
  FILE_CORRUPTED: 'FILE_005',
  VIRUS_DETECTED: 'FILE_006',

  // Payment Errors (9xxx)
  PAYMENT_FAILED: 'PAY_001',
  CARD_DECLINED: 'PAY_002',
  BILLING_ERROR: 'PAY_003',
  SUBSCRIPTION_CANCELLED: 'PAY_004',
  PAYMENT_METHOD_REQUIRED: 'PAY_005',
  INVOICE_NOT_FOUND: 'PAY_006',

  // Multi-Tenant Errors (10xx)
  TENANT_NOT_FOUND: 'TENANT_001',
  TENANT_SUSPENDED: 'TENANT_002',
  TENANT_LIMIT_EXCEEDED: 'TENANT_003',
  CROSS_TENANT_ACCESS: 'TENANT_004',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============ HTTP STATUS MAPPING ============

export const ErrorHttpStatus: Record<ErrorCode, number> = {
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.INVALID_TOKEN]: 401,
  [ErrorCodes.TOKEN_EXPIRED]: 401,
  [ErrorCodes.INVALID_CREDENTIALS]: 401,
  [ErrorCodes.MFA_REQUIRED]: 401,
  [ErrorCodes.ACCOUNT_LOCKED]: 403,
  [ErrorCodes.SESSION_EXPIRED]: 401,
  [ErrorCodes.EMAIL_NOT_VERIFIED]: 403,
  [ErrorCodes.PHONE_NOT_VERIFIED]: 403,
  [ErrorCodes.SSO_REQUIRED]: 403,
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCodes.ROLE_REQUIRED]: 403,
  [ErrorCodes.ORGANIZATION_ACCESS_DENIED]: 403,
  [ErrorCodes.RESOURCE_ACCESS_DENIED]: 403,
  [ErrorCodes.FEATURE_NOT_AVAILABLE]: 403,
  [ErrorCodes.SUBSCRIPTION_REQUIRED]: 402,
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.INVALID_INPUT]: 400,
  [ErrorCodes.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCodes.INVALID_FORMAT]: 400,
  [ErrorCodes.OUT_OF_RANGE]: 400,
  [ErrorCodes.DUPLICATE_VALUE]: 409,
  [ErrorCodes.INVALID_STATE_TRANSITION]: 400,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.ALREADY_EXISTS]: 409,
  [ErrorCodes.CONFLICT]: 409,
  [ErrorCodes.GONE]: 410,
  [ErrorCodes.RESOURCE_LOCKED]: 423,
  [ErrorCodes.RESOURCE_EXPIRED]: 410,
  [ErrorCodes.RATE_LIMITED]: 429,
  [ErrorCodes.QUOTA_EXCEEDED]: 429,
  [ErrorCodes.TOO_MANY_REQUESTS]: 429,
  [ErrorCodes.CONCURRENT_LIMIT_REACHED]: 429,
  [ErrorCodes.INTERNAL_ERROR]: 500,
  [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
  [ErrorCodes.DATABASE_ERROR]: 500,
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCodes.TIMEOUT]: 504,
  [ErrorCodes.CIRCUIT_BREAKER_OPEN]: 503,
  [ErrorCodes.MAINTENANCE_MODE]: 503,
  [ErrorCodes.DEPENDENCY_FAILURE]: 502,
  [ErrorCodes.AI_ERROR]: 500,
  [ErrorCodes.MODEL_UNAVAILABLE]: 503,
  [ErrorCodes.CONTEXT_TOO_LONG]: 400,
  [ErrorCodes.GENERATION_FAILED]: 500,
  [ErrorCodes.VOICE_RECOGNITION_FAILED]: 500,
  [ErrorCodes.CONTENT_FILTERED]: 400,
  [ErrorCodes.TOKEN_LIMIT_EXCEEDED]: 400,
  [ErrorCodes.FILE_TOO_LARGE]: 413,
  [ErrorCodes.INVALID_FILE_TYPE]: 415,
  [ErrorCodes.UPLOAD_FAILED]: 500,
  [ErrorCodes.STORAGE_FULL]: 507,
  [ErrorCodes.FILE_CORRUPTED]: 400,
  [ErrorCodes.VIRUS_DETECTED]: 400,
  [ErrorCodes.PAYMENT_FAILED]: 402,
  [ErrorCodes.CARD_DECLINED]: 402,
  [ErrorCodes.BILLING_ERROR]: 402,
  [ErrorCodes.SUBSCRIPTION_CANCELLED]: 402,
  [ErrorCodes.PAYMENT_METHOD_REQUIRED]: 402,
  [ErrorCodes.INVOICE_NOT_FOUND]: 404,
  [ErrorCodes.TENANT_NOT_FOUND]: 404,
  [ErrorCodes.TENANT_SUSPENDED]: 403,
  [ErrorCodes.TENANT_LIMIT_EXCEEDED]: 429,
  [ErrorCodes.CROSS_TENANT_ACCESS]: 403,
};

// ============ ERROR DETAILS INTERFACE ============

export interface ErrorDetails {
  field?: string;
  constraint?: string;
  received?: unknown;
  expected?: unknown;
  path?: string[];
  resource?: string;
  resourceId?: string;
  retryAfter?: number;
  limit?: number;
  current?: number;
  suggestion?: string;
  documentationUrl?: string;
  [key: string]: unknown;
}

// ============ ERROR CONTEXT FOR LOGGING ============

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  organizationId?: string;
  path?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  timestamp?: Date;
  stack?: string;
  cause?: Error | unknown;
}

// ============ BASE APP ERROR CLASS ============

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly httpStatus: number;
  public readonly details?: ErrorDetails;
  public readonly context?: ErrorContext;
  public readonly timestamp: Date;
  public readonly isOperational: boolean;
  public readonly requestId?: string;

  constructor(
    code: ErrorCode,
    message: string,
    details?: ErrorDetails,
    context?: ErrorContext,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = ErrorHttpStatus[code];
    this.details = details;
    this.context = context;
    this.timestamp = new Date();
    this.isOperational = isOperational;
    this.requestId = context?.requestId;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): ErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp.toISOString(),
        requestId: this.requestId,
      },
    };
  }

  toLogFormat(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      httpStatus: this.httpStatus,
      details: this.details,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      isOperational: this.isOperational,
      stack: this.stack,
    };
  }
}

// ============ SPECIFIC ERROR CLASSES ============

export class AuthenticationError extends AppError {
  constructor(
    code: ErrorCode = ErrorCodes.UNAUTHORIZED,
    message: string = 'Authentication required',
    details?: ErrorDetails,
    context?: ErrorContext
  ) {
    super(code, message, details, context);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(
    code: ErrorCode = ErrorCodes.FORBIDDEN,
    message: string = 'Access denied',
    details?: ErrorDetails,
    context?: ErrorContext
  ) {
    super(code, message, details, context);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(
    resource: string = 'Resource',
    resourceId?: string,
    context?: ErrorContext
  ) {
    super(
      ErrorCodes.NOT_FOUND,
      `${resource} not found`,
      { resource, resourceId },
      context
    );
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  public readonly errors: ValidationFieldError[];

  constructor(
    errors: ValidationFieldError[] | string,
    context?: ErrorContext
  ) {
    const errorList = typeof errors === 'string' 
      ? [{ field: 'unknown', message: errors }] 
      : errors;
    
    const message = errorList.map(e => `${e.field}: ${e.message}`).join(', ');
    
    super(
      ErrorCodes.VALIDATION_ERROR,
      `Validation failed: ${message}`,
      { errors: errorList },
      context
    );
    this.name = 'ValidationError';
    this.errors = errorList;
  }

  static fromZodError(error: ZodError, context?: ErrorContext): ValidationError {
    const errors = error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
      code: e.code,
      received: 'received' in e ? e.received : undefined,
    }));
    return new ValidationError(errors, context);
  }
}

export interface ValidationFieldError {
  field: string;
  message: string;
  code?: string;
  received?: unknown;
}

export class ConflictError extends AppError {
  constructor(
    message: string = 'Resource already exists',
    details?: ErrorDetails,
    context?: ErrorContext
  ) {
    super(ErrorCodes.CONFLICT, message, details, context);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter: number = 60,
    details?: ErrorDetails,
    context?: ErrorContext
  ) {
    super(
      ErrorCodes.RATE_LIMITED,
      message,
      { ...details, retryAfter },
      context
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class QuotaExceededError extends AppError {
  constructor(
    resource: string,
    current: number,
    limit: number,
    context?: ErrorContext
  ) {
    super(
      ErrorCodes.QUOTA_EXCEEDED,
      `${resource} quota exceeded (${current}/${limit})`,
      { resource, current, limit },
      context
    );
    this.name = 'QuotaExceededError';
  }
}

export class DatabaseError extends AppError {
  constructor(
    message: string = 'Database operation failed',
    details?: ErrorDetails,
    context?: ErrorContext
  ) {
    super(ErrorCodes.DATABASE_ERROR, message, details, context, false);
    this.name = 'DatabaseError';
  }
}

export class ExternalServiceError extends AppError {
  public readonly serviceName: string;

  constructor(
    serviceName: string,
    message: string = 'External service error',
    details?: ErrorDetails,
    context?: ErrorContext
  ) {
    super(
      ErrorCodes.EXTERNAL_SERVICE_ERROR,
      `${serviceName}: ${message}`,
      { ...details, serviceName },
      context,
      false
    );
    this.name = 'ExternalServiceError';
    this.serviceName = serviceName;
  }
}

export class AIError extends AppError {
  public readonly agentName?: string;
  public readonly model?: string;

  constructor(
    code: ErrorCode = ErrorCodes.AI_ERROR,
    message: string,
    agentName?: string,
    model?: string,
    details?: ErrorDetails,
    context?: ErrorContext
  ) {
    super(code, message, { ...details, agentName, model }, context);
    this.name = 'AIError';
    this.agentName = agentName;
    this.model = model;
  }
}

export class TenantError extends AppError {
  public readonly tenantId?: string;

  constructor(
    code: ErrorCode = ErrorCodes.TENANT_NOT_FOUND,
    message: string = 'Tenant error',
    tenantId?: string,
    context?: ErrorContext
  ) {
    super(code, message, { tenantId }, context);
    this.name = 'TenantError';
    this.tenantId = tenantId;
  }
}

export class MaintenanceModeError extends AppError {
  public readonly estimatedEndTime?: Date;

  constructor(
    message: string = 'System is under maintenance',
    estimatedEndTime?: Date,
    context?: ErrorContext
  ) {
    super(
      ErrorCodes.MAINTENANCE_MODE,
      message,
      { estimatedEndTime: estimatedEndTime?.toISOString() },
      context
    );
    this.name = 'MaintenanceModeError';
    this.estimatedEndTime = estimatedEndTime;
  }
}

// ============ ERROR RESPONSE INTERFACE ============

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ErrorDetails;
    timestamp: string;
    requestId?: string;
  };
}

// ============ ERROR HELPERS ============

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isOperationalError(error: unknown): boolean {
  return isAppError(error) && error.isOperational;
}

export function normalizeError(
  error: unknown,
  context?: ErrorContext
): AppError {
  // Already an AppError
  if (isAppError(error)) {
    if (context && !error.context) {
      return new AppError(
        error.code,
        error.message,
        error.details,
        context,
        error.isOperational
      );
    }
    return error;
  }

  // Zod validation error
  if (error instanceof ZodError) {
    return ValidationError.fromZodError(error, context);
  }

  // Standard Error
  if (error instanceof Error) {
    return new AppError(
      ErrorCodes.INTERNAL_ERROR,
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message,
      { originalError: error.name },
      { ...context, cause: error, stack: error.stack },
      false
    );
  }

  // Unknown error type
  return new AppError(
    ErrorCodes.INTERNAL_ERROR,
    'An unexpected error occurred',
    { originalError: String(error) },
    context,
    false
  );
}

export function formatErrorResponse(
  error: unknown,
  context?: ErrorContext
): ErrorResponse {
  const appError = normalizeError(error, context);
  return appError.toJSON();
}

// ============ ASYNC ERROR HANDLER ============

export type AsyncFunction<T extends unknown[], R> = (...args: T) => Promise<R>;

export function asyncHandler<T extends unknown[], R>(
  fn: AsyncFunction<T, R>,
  context?: ErrorContext
): AsyncFunction<T, R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw normalizeError(error, context);
    }
  };
}

// ============ TRY-CATCH WRAPPERS ============

export type Result<T, E = AppError> = 
  | { success: true; data: T }
  | { success: false; error: E };

export async function tryCatch<T>(
  fn: () => Promise<T>,
  context?: ErrorContext
): Promise<Result<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: normalizeError(error, context) };
  }
}

export function tryCatchSync<T>(
  fn: () => T,
  context?: ErrorContext
): Result<T> {
  try {
    const data = fn();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: normalizeError(error, context) };
  }
}

// ============ ERROR LOGGING HELPER ============

export interface ErrorLogger {
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
}

export function logError(
  error: unknown,
  logger: ErrorLogger,
  context?: ErrorContext
): void {
  const appError = normalizeError(error, context);
  const logData = appError.toLogFormat();

  if (appError.isOperational) {
    logger.warn(`Operational error: ${appError.message}`, logData);
  } else {
    logger.error(`System error: ${appError.message}`, logData);
  }
}

// ============ ERROR AGGREGATOR ============

export class ErrorAggregator {
  private errors: AppError[] = [];

  add(error: unknown, context?: ErrorContext): void {
    this.errors.push(normalizeError(error, context));
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  getErrors(): AppError[] {
    return [...this.errors];
  }

  clear(): void {
    this.errors = [];
  }

  throwIfErrors(message: string = 'Multiple errors occurred'): void {
    if (this.hasErrors()) {
      const details = {
        errors: this.errors.map(e => ({
          code: e.code,
          message: e.message,
          details: e.details,
        })),
        count: this.errors.length,
      };
      throw new AppError(ErrorCodes.VALIDATION_ERROR, message, details);
    }
  }
}

// ============ CIRCUIT BREAKER ERROR ============

export class CircuitBreakerError extends AppError {
  constructor(
    serviceName: string,
    state: 'open' | 'half-open',
    context?: ErrorContext
  ) {
    super(
      ErrorCodes.CIRCUIT_BREAKER_OPEN,
      `Circuit breaker ${state} for service: ${serviceName}`,
      { serviceName, state },
      context
    );
    this.name = 'CircuitBreakerError';
  }
}

// ============ TIMEOUT ERROR ============

export class TimeoutError extends AppError {
  constructor(
    operation: string,
    timeoutMs: number,
    context?: ErrorContext
  ) {
    super(
      ErrorCodes.TIMEOUT,
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      { operation, timeoutMs },
      context
    );
    this.name = 'TimeoutError';
  }
}

// ============ RETRY HELPER WITH ERROR HANDLING ============

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  retryCondition?: (error: AppError) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
  context?: ErrorContext
): Promise<T> {
  const {
    maxAttempts,
    delayMs,
    backoffMultiplier = 2,
    maxDelayMs = 30000,
    retryCondition = (e) => !e.isOperational,
  } = options;

  let lastError: AppError | undefined;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = normalizeError(error, context);

      if (attempt === maxAttempts || !retryCondition(lastError)) {
        throw lastError;
      }

      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}
