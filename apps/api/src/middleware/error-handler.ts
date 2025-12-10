// ==============================================
// PLUGSPACE.IO TITAN v1.4 - TRPC ERROR HANDLER
// ==============================================

import { TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import {
  AppError,
  ErrorCodes,
  normalizeError,
  isAppError,
  isOperationalError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  AIError,
  type ErrorCode,
  type ErrorContext,
} from '@plugspace/utils/errors';
import { logger } from '../lib/logger';

// ============ TRPC ERROR CODE MAPPING ============

const errorCodeToTRPCCode: Record<string, TRPCError['code']> = {
  // Authentication (401)
  [ErrorCodes.UNAUTHORIZED]: 'UNAUTHORIZED',
  [ErrorCodes.INVALID_TOKEN]: 'UNAUTHORIZED',
  [ErrorCodes.TOKEN_EXPIRED]: 'UNAUTHORIZED',
  [ErrorCodes.INVALID_CREDENTIALS]: 'UNAUTHORIZED',
  [ErrorCodes.MFA_REQUIRED]: 'UNAUTHORIZED',
  [ErrorCodes.SESSION_EXPIRED]: 'UNAUTHORIZED',

  // Authorization (403)
  [ErrorCodes.FORBIDDEN]: 'FORBIDDEN',
  [ErrorCodes.ACCOUNT_LOCKED]: 'FORBIDDEN',
  [ErrorCodes.EMAIL_NOT_VERIFIED]: 'FORBIDDEN',
  [ErrorCodes.PHONE_NOT_VERIFIED]: 'FORBIDDEN',
  [ErrorCodes.SSO_REQUIRED]: 'FORBIDDEN',
  [ErrorCodes.INSUFFICIENT_PERMISSIONS]: 'FORBIDDEN',
  [ErrorCodes.ROLE_REQUIRED]: 'FORBIDDEN',
  [ErrorCodes.ORGANIZATION_ACCESS_DENIED]: 'FORBIDDEN',
  [ErrorCodes.RESOURCE_ACCESS_DENIED]: 'FORBIDDEN',
  [ErrorCodes.FEATURE_NOT_AVAILABLE]: 'FORBIDDEN',
  [ErrorCodes.TENANT_SUSPENDED]: 'FORBIDDEN',
  [ErrorCodes.CROSS_TENANT_ACCESS]: 'FORBIDDEN',

  // Validation (400)
  [ErrorCodes.VALIDATION_ERROR]: 'BAD_REQUEST',
  [ErrorCodes.INVALID_INPUT]: 'BAD_REQUEST',
  [ErrorCodes.MISSING_REQUIRED_FIELD]: 'BAD_REQUEST',
  [ErrorCodes.INVALID_FORMAT]: 'BAD_REQUEST',
  [ErrorCodes.OUT_OF_RANGE]: 'BAD_REQUEST',
  [ErrorCodes.INVALID_STATE_TRANSITION]: 'BAD_REQUEST',
  [ErrorCodes.CONTEXT_TOO_LONG]: 'BAD_REQUEST',
  [ErrorCodes.CONTENT_FILTERED]: 'BAD_REQUEST',
  [ErrorCodes.TOKEN_LIMIT_EXCEEDED]: 'BAD_REQUEST',
  [ErrorCodes.FILE_CORRUPTED]: 'BAD_REQUEST',
  [ErrorCodes.VIRUS_DETECTED]: 'BAD_REQUEST',

  // Not Found (404)
  [ErrorCodes.NOT_FOUND]: 'NOT_FOUND',
  [ErrorCodes.TENANT_NOT_FOUND]: 'NOT_FOUND',
  [ErrorCodes.INVOICE_NOT_FOUND]: 'NOT_FOUND',

  // Conflict (409)
  [ErrorCodes.ALREADY_EXISTS]: 'CONFLICT',
  [ErrorCodes.CONFLICT]: 'CONFLICT',
  [ErrorCodes.DUPLICATE_VALUE]: 'CONFLICT',

  // Gone (410)
  [ErrorCodes.GONE]: 'NOT_FOUND',
  [ErrorCodes.RESOURCE_EXPIRED]: 'NOT_FOUND',

  // Payment Required (402)
  [ErrorCodes.SUBSCRIPTION_REQUIRED]: 'PRECONDITION_FAILED',
  [ErrorCodes.PAYMENT_FAILED]: 'PRECONDITION_FAILED',
  [ErrorCodes.CARD_DECLINED]: 'PRECONDITION_FAILED',
  [ErrorCodes.BILLING_ERROR]: 'PRECONDITION_FAILED',
  [ErrorCodes.SUBSCRIPTION_CANCELLED]: 'PRECONDITION_FAILED',
  [ErrorCodes.PAYMENT_METHOD_REQUIRED]: 'PRECONDITION_FAILED',

  // Rate Limiting (429)
  [ErrorCodes.RATE_LIMITED]: 'TOO_MANY_REQUESTS',
  [ErrorCodes.QUOTA_EXCEEDED]: 'TOO_MANY_REQUESTS',
  [ErrorCodes.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
  [ErrorCodes.CONCURRENT_LIMIT_REACHED]: 'TOO_MANY_REQUESTS',
  [ErrorCodes.TENANT_LIMIT_EXCEEDED]: 'TOO_MANY_REQUESTS',

  // File Errors
  [ErrorCodes.FILE_TOO_LARGE]: 'PAYLOAD_TOO_LARGE',
  [ErrorCodes.INVALID_FILE_TYPE]: 'BAD_REQUEST',
  [ErrorCodes.UPLOAD_FAILED]: 'INTERNAL_SERVER_ERROR',
  [ErrorCodes.STORAGE_FULL]: 'PRECONDITION_FAILED',

  // Server Errors (5xx)
  [ErrorCodes.INTERNAL_ERROR]: 'INTERNAL_SERVER_ERROR',
  [ErrorCodes.DATABASE_ERROR]: 'INTERNAL_SERVER_ERROR',
  [ErrorCodes.SERVICE_UNAVAILABLE]: 'INTERNAL_SERVER_ERROR',
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 'BAD_GATEWAY',
  [ErrorCodes.TIMEOUT]: 'TIMEOUT',
  [ErrorCodes.CIRCUIT_BREAKER_OPEN]: 'INTERNAL_SERVER_ERROR',
  [ErrorCodes.MAINTENANCE_MODE]: 'INTERNAL_SERVER_ERROR',
  [ErrorCodes.DEPENDENCY_FAILURE]: 'BAD_GATEWAY',

  // AI Errors
  [ErrorCodes.AI_ERROR]: 'INTERNAL_SERVER_ERROR',
  [ErrorCodes.MODEL_UNAVAILABLE]: 'INTERNAL_SERVER_ERROR',
  [ErrorCodes.GENERATION_FAILED]: 'INTERNAL_SERVER_ERROR',
  [ErrorCodes.VOICE_RECOGNITION_FAILED]: 'INTERNAL_SERVER_ERROR',

  // Resource Locked
  [ErrorCodes.RESOURCE_LOCKED]: 'CONFLICT',
};

// ============ ERROR TRANSFORMER ============

export interface TransformedError {
  code: TRPCError['code'];
  message: string;
  cause?: {
    errorCode: string;
    details?: unknown;
    requestId?: string;
    timestamp: string;
  };
}

export function transformError(
  error: unknown,
  context?: ErrorContext
): TransformedError {
  // Handle TRPCError pass-through
  if (error instanceof TRPCError) {
    return {
      code: error.code,
      message: error.message,
      cause: error.cause as TransformedError['cause'],
    };
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationError = ValidationError.fromZodError(error, context);
    return transformAppError(validationError);
  }

  // Handle our custom AppError
  if (isAppError(error)) {
    return transformAppError(error);
  }

  // Handle standard Error
  if (error instanceof Error) {
    const appError = normalizeError(error, context);
    return transformAppError(appError);
  }

  // Handle unknown errors
  const appError = normalizeError(error, context);
  return transformAppError(appError);
}

function transformAppError(error: AppError): TransformedError {
  const trpcCode = errorCodeToTRPCCode[error.code] || 'INTERNAL_SERVER_ERROR';

  return {
    code: trpcCode,
    message: error.message,
    cause: {
      errorCode: error.code,
      details: error.details,
      requestId: error.requestId,
      timestamp: error.timestamp.toISOString(),
    },
  };
}

// ============ TRPC ERROR FACTORY ============

export function createTRPCError(
  error: unknown,
  context?: ErrorContext
): TRPCError {
  const transformed = transformError(error, context);

  // Log the error
  logError(error, context);

  return new TRPCError({
    code: transformed.code,
    message: transformed.message,
    cause: transformed.cause,
  });
}

// ============ ERROR LOGGING ============

function logError(error: unknown, context?: ErrorContext): void {
  const appError = isAppError(error) ? error : normalizeError(error, context);

  const logData = {
    errorCode: appError.code,
    message: appError.message,
    httpStatus: appError.httpStatus,
    details: appError.details,
    context: appError.context,
    stack: appError.stack,
    isOperational: appError.isOperational,
  };

  if (isOperationalError(error)) {
    // Expected errors (user input, business logic)
    logger.warn('Operational error occurred', logData);
  } else {
    // Unexpected errors (bugs, system failures)
    logger.error('System error occurred', logData);

    // Alert for critical errors in production
    if (process.env.NODE_ENV === 'production') {
      alertCriticalError(appError);
    }
  }
}

function alertCriticalError(error: AppError): void {
  // Send to Sentry or other error tracking
  // This is a placeholder - implement actual alerting
  logger.error('CRITICAL ERROR ALERT', {
    code: error.code,
    message: error.message,
    stack: error.stack,
  });
}

// ============ ERROR RESPONSE FORMATTER ============

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
    timestamp: string;
    suggestion?: string;
    documentationUrl?: string;
  };
}

export function formatErrorResponse(
  error: TRPCError,
  requestId?: string
): ErrorResponse {
  const cause = error.cause as TransformedError['cause'];

  // Get user-friendly message
  const message = sanitizeErrorMessage(error.message, error.code);

  // Get suggestion based on error type
  const suggestion = getErrorSuggestion(cause?.errorCode);

  return {
    success: false,
    error: {
      code: cause?.errorCode || error.code,
      message,
      details: cause?.details,
      requestId: requestId || cause?.requestId,
      timestamp: cause?.timestamp || new Date().toISOString(),
      suggestion,
      documentationUrl: getDocumentationUrl(cause?.errorCode),
    },
  };
}

function sanitizeErrorMessage(message: string, code: TRPCError['code']): string {
  // In production, hide internal error details
  if (process.env.NODE_ENV === 'production') {
    if (code === 'INTERNAL_SERVER_ERROR') {
      return 'An unexpected error occurred. Please try again later.';
    }
    if (code === 'BAD_GATEWAY') {
      return 'A service dependency is temporarily unavailable.';
    }
    if (code === 'TIMEOUT') {
      return 'The request timed out. Please try again.';
    }
  }

  return message;
}

function getErrorSuggestion(errorCode?: string): string | undefined {
  if (!errorCode) return undefined;

  const suggestions: Record<string, string> = {
    [ErrorCodes.UNAUTHORIZED]: 'Please log in to access this resource.',
    [ErrorCodes.INVALID_TOKEN]: 'Your session has expired. Please log in again.',
    [ErrorCodes.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
    [ErrorCodes.MFA_REQUIRED]: 'Please complete two-factor authentication.',
    [ErrorCodes.ACCOUNT_LOCKED]:
      'Your account has been temporarily locked. Try again later or reset your password.',
    [ErrorCodes.EMAIL_NOT_VERIFIED]:
      'Please verify your email address to continue.',
    [ErrorCodes.INSUFFICIENT_PERMISSIONS]:
      'Contact your administrator for access.',
    [ErrorCodes.SUBSCRIPTION_REQUIRED]:
      'Upgrade your plan to access this feature.',
    [ErrorCodes.QUOTA_EXCEEDED]:
      'You have reached your usage limit. Consider upgrading your plan.',
    [ErrorCodes.RATE_LIMITED]:
      'Too many requests. Please wait a moment and try again.',
    [ErrorCodes.VALIDATION_ERROR]: 'Please check your input and try again.',
    [ErrorCodes.NOT_FOUND]: 'The requested resource does not exist.',
    [ErrorCodes.CONFLICT]: 'This resource already exists or is in use.',
    [ErrorCodes.FILE_TOO_LARGE]: 'Please upload a smaller file.',
    [ErrorCodes.INVALID_FILE_TYPE]: 'Please upload a supported file format.',
    [ErrorCodes.PAYMENT_FAILED]: 'Please check your payment method and try again.',
    [ErrorCodes.AI_ERROR]: 'Our AI service encountered an issue. Please try again.',
    [ErrorCodes.MODEL_UNAVAILABLE]:
      'The AI model is temporarily unavailable. Please try again shortly.',
  };

  return suggestions[errorCode];
}

function getDocumentationUrl(errorCode?: string): string | undefined {
  if (!errorCode) return undefined;

  const baseUrl = 'https://docs.plugspace.io/errors';

  // Group errors by category for documentation
  if (errorCode.startsWith('AUTH_')) {
    return `${baseUrl}/authentication`;
  }
  if (errorCode.startsWith('AUTHZ_')) {
    return `${baseUrl}/authorization`;
  }
  if (errorCode.startsWith('VAL_')) {
    return `${baseUrl}/validation`;
  }
  if (errorCode.startsWith('RATE_')) {
    return `${baseUrl}/rate-limiting`;
  }
  if (errorCode.startsWith('AI_')) {
    return `${baseUrl}/ai-services`;
  }
  if (errorCode.startsWith('PAY_')) {
    return `${baseUrl}/billing`;
  }
  if (errorCode.startsWith('TENANT_')) {
    return `${baseUrl}/multi-tenancy`;
  }

  return `${baseUrl}#${errorCode}`;
}

// ============ ERROR HELPERS FOR PROCEDURES ============

export const throwNotFound = (resource: string, resourceId?: string): never => {
  throw createTRPCError(new NotFoundError(resource, resourceId));
};

export const throwUnauthorized = (message?: string): never => {
  throw createTRPCError(
    new AuthenticationError(ErrorCodes.UNAUTHORIZED, message)
  );
};

export const throwForbidden = (message?: string): never => {
  throw createTRPCError(
    new AuthorizationError(ErrorCodes.FORBIDDEN, message)
  );
};

export const throwValidation = (
  errors: Array<{ field: string; message: string }>
): never => {
  throw createTRPCError(new ValidationError(errors));
};

export const throwRateLimit = (retryAfter?: number): never => {
  throw createTRPCError(
    new RateLimitError('Rate limit exceeded', retryAfter)
  );
};

export const throwConflict = (message: string): never => {
  throw createTRPCError(
    new AppError(ErrorCodes.CONFLICT, message)
  );
};

export const throwQuotaExceeded = (
  resource: string,
  current: number,
  limit: number
): never => {
  throw createTRPCError(
    new AppError(
      ErrorCodes.QUOTA_EXCEEDED,
      `${resource} quota exceeded (${current}/${limit})`,
      { resource, current, limit }
    )
  );
};

export const throwDatabaseError = (message: string): never => {
  throw createTRPCError(new DatabaseError(message));
};

export const throwExternalServiceError = (
  serviceName: string,
  message?: string
): never => {
  throw createTRPCError(new ExternalServiceError(serviceName, message));
};

export const throwAIError = (
  message: string,
  agentName?: string,
  model?: string
): never => {
  throw createTRPCError(
    new AIError(ErrorCodes.AI_ERROR, message, agentName, model)
  );
};

// ============ ERROR BOUNDARY FOR ASYNC OPERATIONS ============

export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: ErrorContext
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw createTRPCError(error, context);
  }
}

// ============ PRISMA ERROR HANDLER ============

export function handlePrismaError(error: unknown): never {
  // Check if it's a Prisma error
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: unknown };

    switch (prismaError.code) {
      case 'P2002': // Unique constraint violation
        throw createTRPCError(
          new AppError(
            ErrorCodes.ALREADY_EXISTS,
            'A record with this value already exists',
            { constraint: prismaError.meta }
          )
        );

      case 'P2025': // Record not found
        throw createTRPCError(new NotFoundError('Record'));

      case 'P2003': // Foreign key constraint failed
        throw createTRPCError(
          new AppError(
            ErrorCodes.VALIDATION_ERROR,
            'Invalid reference to related record',
            { constraint: prismaError.meta }
          )
        );

      case 'P2014': // Required relation violation
        throw createTRPCError(
          new AppError(
            ErrorCodes.VALIDATION_ERROR,
            'Required related record is missing'
          )
        );

      case 'P2024': // Connection pool timeout
        throw createTRPCError(
          new DatabaseError('Database connection timeout')
        );

      default:
        throw createTRPCError(
          new DatabaseError(`Database error: ${prismaError.code}`)
        );
    }
  }

  throw createTRPCError(error);
}

// ============ EXTERNAL API ERROR HANDLER ============

export function handleExternalAPIError(
  serviceName: string,
  error: unknown
): never {
  if (error && typeof error === 'object') {
    const apiError = error as { status?: number; message?: string };

    if (apiError.status === 401) {
      throw createTRPCError(
        new ExternalServiceError(serviceName, 'Authentication failed')
      );
    }

    if (apiError.status === 403) {
      throw createTRPCError(
        new ExternalServiceError(serviceName, 'Access denied')
      );
    }

    if (apiError.status === 404) {
      throw createTRPCError(
        new ExternalServiceError(serviceName, 'Resource not found')
      );
    }

    if (apiError.status === 429) {
      throw createTRPCError(
        new ExternalServiceError(serviceName, 'Rate limit exceeded')
      );
    }

    if (apiError.status && apiError.status >= 500) {
      throw createTRPCError(
        new ExternalServiceError(serviceName, 'Service unavailable')
      );
    }

    if (apiError.message) {
      throw createTRPCError(
        new ExternalServiceError(serviceName, apiError.message)
      );
    }
  }

  throw createTRPCError(new ExternalServiceError(serviceName));
}
