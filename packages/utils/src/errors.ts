// ==============================================
// PLUGSPACE.IO TITAN v1.4 - ERROR UTILITIES
// ==============================================

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

  // Authorization Errors (2xxx)
  FORBIDDEN: 'AUTHZ_001',
  INSUFFICIENT_PERMISSIONS: 'AUTHZ_002',
  ROLE_REQUIRED: 'AUTHZ_003',
  ORGANIZATION_ACCESS_DENIED: 'AUTHZ_004',

  // Validation Errors (3xxx)
  VALIDATION_ERROR: 'VAL_001',
  INVALID_INPUT: 'VAL_002',
  MISSING_REQUIRED_FIELD: 'VAL_003',
  INVALID_FORMAT: 'VAL_004',
  OUT_OF_RANGE: 'VAL_005',

  // Resource Errors (4xxx)
  NOT_FOUND: 'RES_001',
  ALREADY_EXISTS: 'RES_002',
  CONFLICT: 'RES_003',
  GONE: 'RES_004',

  // Rate Limiting Errors (5xxx)
  RATE_LIMITED: 'RATE_001',
  QUOTA_EXCEEDED: 'RATE_002',
  TOO_MANY_REQUESTS: 'RATE_003',

  // Server Errors (6xxx)
  INTERNAL_ERROR: 'SRV_001',
  SERVICE_UNAVAILABLE: 'SRV_002',
  DATABASE_ERROR: 'SRV_003',
  EXTERNAL_SERVICE_ERROR: 'SRV_004',
  TIMEOUT: 'SRV_005',

  // AI/Agent Errors (7xxx)
  AI_ERROR: 'AI_001',
  MODEL_UNAVAILABLE: 'AI_002',
  CONTEXT_TOO_LONG: 'AI_003',
  GENERATION_FAILED: 'AI_004',
  VOICE_RECOGNITION_FAILED: 'AI_005',

  // File/Upload Errors (8xxx)
  FILE_TOO_LARGE: 'FILE_001',
  INVALID_FILE_TYPE: 'FILE_002',
  UPLOAD_FAILED: 'FILE_003',
  STORAGE_FULL: 'FILE_004',

  // Payment Errors (9xxx)
  PAYMENT_FAILED: 'PAY_001',
  SUBSCRIPTION_REQUIRED: 'PAY_002',
  CARD_DECLINED: 'PAY_003',
  BILLING_ERROR: 'PAY_004',
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
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCodes.ROLE_REQUIRED]: 403,
  [ErrorCodes.ORGANIZATION_ACCESS_DENIED]: 403,
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.INVALID_INPUT]: 400,
  [ErrorCodes.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCodes.INVALID_FORMAT]: 400,
  [ErrorCodes.OUT_OF_RANGE]: 400,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.ALREADY_EXISTS]: 409,
  [ErrorCodes.CONFLICT]: 409,
  [ErrorCodes.GONE]: 410,
  [ErrorCodes.RATE_LIMITED]: 429,
  [ErrorCodes.QUOTA_EXCEEDED]: 429,
  [ErrorCodes.TOO_MANY_REQUESTS]: 429,
  [ErrorCodes.INTERNAL_ERROR]: 500,
  [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
  [ErrorCodes.DATABASE_ERROR]: 500,
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCodes.TIMEOUT]: 504,
  [ErrorCodes.AI_ERROR]: 500,
  [ErrorCodes.MODEL_UNAVAILABLE]: 503,
  [ErrorCodes.CONTEXT_TOO_LONG]: 400,
  [ErrorCodes.GENERATION_FAILED]: 500,
  [ErrorCodes.VOICE_RECOGNITION_FAILED]: 500,
  [ErrorCodes.FILE_TOO_LARGE]: 413,
  [ErrorCodes.INVALID_FILE_TYPE]: 415,
  [ErrorCodes.UPLOAD_FAILED]: 500,
  [ErrorCodes.STORAGE_FULL]: 507,
  [ErrorCodes.PAYMENT_FAILED]: 402,
  [ErrorCodes.SUBSCRIPTION_REQUIRED]: 402,
  [ErrorCodes.CARD_DECLINED]: 402,
  [ErrorCodes.BILLING_ERROR]: 402,
};

// ============ CUSTOM ERROR CLASSES ============

export interface ErrorDetails {
  field?: string;
  constraint?: string;
  received?: unknown;
  expected?: unknown;
  [key: string]: unknown;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly httpStatus: number;
  public readonly details?: ErrorDetails;
  public readonly timestamp: Date;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    details?: ErrorDetails,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = ErrorHttpStatus[code];
    this.details = details;
    this.timestamp = new Date();
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp.toISOString(),
      },
    };
  }
}

// ============ SPECIFIC ERROR CLASSES ============

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details?: ErrorDetails) {
    super(ErrorCodes.UNAUTHORIZED, message, details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', details?: ErrorDetails) {
    super(ErrorCodes.FORBIDDEN, message, details);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', details?: ErrorDetails) {
    super(ErrorCodes.NOT_FOUND, `${resource} not found`, details);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  public readonly errors: string[];

  constructor(errors: string | string[], details?: ErrorDetails) {
    const errorList = Array.isArray(errors) ? errors : [errors];
    super(
      ErrorCodes.VALIDATION_ERROR,
      errorList.join(', '),
      details
    );
    this.name = 'ValidationError';
    this.errors = errorList;
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists', details?: ErrorDetails) {
    super(ErrorCodes.CONFLICT, message, details);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(ErrorCodes.RATE_LIMITED, message, { retryAfter });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class QuotaExceededError extends AppError {
  constructor(resource: string, current: number, max: number) {
    super(
      ErrorCodes.QUOTA_EXCEEDED,
      `${resource} quota exceeded (${current}/${max})`,
      { resource, current, max }
    );
    this.name = 'QuotaExceededError';
  }
}

export class AIError extends AppError {
  public readonly agentName?: string;
  public readonly model?: string;

  constructor(
    message: string,
    agentName?: string,
    model?: string,
    details?: ErrorDetails
  ) {
    super(ErrorCodes.AI_ERROR, message, { ...details, agentName, model });
    this.name = 'AIError';
    this.agentName = agentName;
    this.model = model;
  }
}

// ============ ERROR HELPERS ============

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isOperationalError(error: unknown): boolean {
  return isAppError(error) && error.isOperational;
}

export function normalizeError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(
      ErrorCodes.INTERNAL_ERROR,
      error.message,
      { originalError: error.name },
      false
    );
  }

  return new AppError(
    ErrorCodes.INTERNAL_ERROR,
    'An unexpected error occurred',
    { originalError: String(error) },
    false
  );
}

export function formatErrorResponse(error: unknown): {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ErrorDetails;
  };
} {
  const appError = normalizeError(error);
  return {
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
    },
  };
}

// ============ ASYNC ERROR HANDLER ============

export function asyncHandler<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw normalizeError(error);
    }
  }) as T;
}

// ============ TRY-CATCH WRAPPER ============

export async function tryCatch<T>(
  fn: () => Promise<T>
): Promise<[T, null] | [null, AppError]> {
  try {
    const result = await fn();
    return [result, null];
  } catch (error) {
    return [null, normalizeError(error)];
  }
}

export function tryCatchSync<T>(
  fn: () => T
): [T, null] | [null, AppError] {
  try {
    const result = fn();
    return [result, null];
  } catch (error) {
    return [null, normalizeError(error)];
  }
}
