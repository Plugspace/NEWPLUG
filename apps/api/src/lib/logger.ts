// ==============================================
// PLUGSPACE.IO TITAN v1.4 - ENTERPRISE LOGGER
// ==============================================

import { createLogger, format, transports, Logger as WinstonLogger } from 'winston';
import { v4 as uuidv4 } from 'uuid';

// ============ LOG LEVELS ============

export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

const LOG_COLORS: Record<LogLevel, string> = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'gray',
};

// ============ LOG CONTEXT ============

export interface LogContext {
  requestId?: string;
  userId?: string;
  organizationId?: string;
  sessionId?: string;
  path?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  statusCode?: number;
  [key: string]: unknown;
}

// ============ CUSTOM FORMATS ============

const sensitiveFields = [
  'password',
  'token',
  'secret',
  'apiKey',
  'authorization',
  'cookie',
  'creditCard',
  'ssn',
  'mfaSecret',
  'backupCodes',
  'refreshToken',
];

const redactSensitiveData = format((info) => {
  const redact = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        result[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = redact(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  return redact(info as Record<string, unknown>) as typeof info;
});

const customFormat = format.printf(({ level, message, timestamp, ...metadata }) => {
  const meta = Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : '';
  return `${timestamp} [${level.toUpperCase()}]: ${message} ${meta}`;
});

const jsonFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  redactSensitiveData(),
  format.errors({ stack: true }),
  format.json()
);

const consoleFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.colorize({ all: true, colors: LOG_COLORS }),
  redactSensitiveData(),
  format.errors({ stack: true }),
  customFormat
);

// ============ LOGGER CONFIGURATION ============

const logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
const isProduction = process.env.NODE_ENV === 'production';
const logFormat = process.env.LOG_FORMAT || (isProduction ? 'json' : 'simple');

// Create base logger
const winstonLogger: WinstonLogger = createLogger({
  level: logLevel,
  levels: LOG_LEVELS,
  defaultMeta: {
    service: 'plugspace-api',
    version: process.env.APP_VERSION || '1.4.0',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console transport
    new transports.Console({
      format: logFormat === 'json' ? jsonFormat : consoleFormat,
    }),
    
    // File transports for production
    ...(isProduction
      ? [
          // Error log
          new transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: jsonFormat,
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
          }),
          // Combined log
          new transports.File({
            filename: 'logs/combined.log',
            format: jsonFormat,
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 10,
          }),
        ]
      : []),
  ],
  // Don't exit on handled errors
  exitOnError: false,
});

// ============ LOGGER CLASS ============

class Logger {
  private context: LogContext = {};
  private requestId: string;

  constructor() {
    this.requestId = uuidv4();
  }

  // Set context for all subsequent logs
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  // Clear context
  clearContext(): void {
    this.context = {};
    this.requestId = uuidv4();
  }

  // Get current request ID
  getRequestId(): string {
    return this.requestId;
  }

  // Create child logger with specific context
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.setContext({ ...this.context, ...context });
    return childLogger;
  }

  // Log methods
  error(message: string, meta?: LogContext | Error): void {
    const metadata = this.buildMetadata(meta);
    winstonLogger.error(message, metadata);
  }

  warn(message: string, meta?: LogContext): void {
    const metadata = this.buildMetadata(meta);
    winstonLogger.warn(message, metadata);
  }

  info(message: string, meta?: LogContext): void {
    const metadata = this.buildMetadata(meta);
    winstonLogger.info(message, metadata);
  }

  http(message: string, meta?: LogContext): void {
    const metadata = this.buildMetadata(meta);
    winstonLogger.http(message, metadata);
  }

  verbose(message: string, meta?: LogContext): void {
    const metadata = this.buildMetadata(meta);
    winstonLogger.verbose(message, metadata);
  }

  debug(message: string, meta?: LogContext): void {
    const metadata = this.buildMetadata(meta);
    winstonLogger.debug(message, metadata);
  }

  silly(message: string, meta?: LogContext): void {
    const metadata = this.buildMetadata(meta);
    winstonLogger.silly(message, metadata);
  }

  // Build metadata with context
  private buildMetadata(meta?: LogContext | Error): LogContext {
    const baseMetadata: LogContext = {
      requestId: this.requestId,
      ...this.context,
    };

    if (!meta) {
      return baseMetadata;
    }

    if (meta instanceof Error) {
      return {
        ...baseMetadata,
        error: {
          name: meta.name,
          message: meta.message,
          stack: meta.stack,
        },
      };
    }

    return {
      ...baseMetadata,
      ...meta,
    };
  }

  // HTTP request logging
  logRequest(req: {
    method: string;
    path: string;
    ip?: string;
    userAgent?: string;
    userId?: string;
    organizationId?: string;
    body?: unknown;
    query?: unknown;
  }): void {
    this.http('Incoming request', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.userAgent,
      userId: req.userId,
      organizationId: req.organizationId,
      body: req.body,
      query: req.query,
    });
  }

  // HTTP response logging
  logResponse(res: {
    method: string;
    path: string;
    statusCode: number;
    duration: number;
    userId?: string;
    organizationId?: string;
  }): void {
    const level: LogLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'http';
    
    this[level]('Request completed', {
      method: res.method,
      path: res.path,
      statusCode: res.statusCode,
      duration: res.duration,
      userId: res.userId,
      organizationId: res.organizationId,
    });
  }

  // Database query logging
  logQuery(query: {
    operation: string;
    model: string;
    duration: number;
    success: boolean;
    error?: string;
  }): void {
    const level: LogLevel = query.success ? 'debug' : 'error';
    this[level]('Database query', query);
  }

  // AI interaction logging
  logAIInteraction(interaction: {
    agentName: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    cost: number;
    success: boolean;
    error?: string;
    userId?: string;
    projectId?: string;
  }): void {
    const level: LogLevel = interaction.success ? 'info' : 'error';
    this[level]('AI interaction', interaction);
  }

  // Security event logging
  logSecurityEvent(event: {
    type: 'login' | 'logout' | 'login_failed' | 'mfa_challenge' | 'password_change' | 'suspicious_activity';
    userId?: string;
    email?: string;
    ip?: string;
    userAgent?: string;
    details?: Record<string, unknown>;
  }): void {
    const level: LogLevel = ['login_failed', 'suspicious_activity'].includes(event.type) ? 'warn' : 'info';
    this[level](`Security event: ${event.type}`, event);
  }

  // Audit log
  logAudit(audit: {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    changes?: Record<string, unknown>;
    ip?: string;
  }): void {
    this.info('Audit log', {
      ...audit,
      auditTimestamp: new Date().toISOString(),
    });
  }

  // Performance metric logging
  logMetric(metric: {
    name: string;
    value: number;
    unit: string;
    tags?: Record<string, string>;
  }): void {
    this.verbose('Metric', metric);
  }

  // External service call logging
  logExternalCall(call: {
    service: string;
    method: string;
    url?: string;
    duration: number;
    statusCode?: number;
    success: boolean;
    error?: string;
  }): void {
    const level: LogLevel = call.success ? 'debug' : 'warn';
    this[level]('External service call', call);
  }

  // Background job logging
  logJob(job: {
    name: string;
    status: 'started' | 'completed' | 'failed' | 'retrying';
    duration?: number;
    attempt?: number;
    error?: string;
    data?: Record<string, unknown>;
  }): void {
    const level: LogLevel = job.status === 'failed' ? 'error' : job.status === 'retrying' ? 'warn' : 'info';
    this[level](`Job ${job.status}: ${job.name}`, job);
  }
}

// ============ SINGLETON INSTANCE ============

export const logger = new Logger();

// ============ REQUEST CONTEXT LOGGER ============

// AsyncLocalStorage for request-scoped logging
import { AsyncLocalStorage } from 'async_hooks';

const asyncLocalStorage = new AsyncLocalStorage<Logger>();

export function createRequestLogger(context: LogContext): Logger {
  const requestLogger = new Logger();
  requestLogger.setContext(context);
  return requestLogger;
}

export function runWithLogger<T>(logger: Logger, fn: () => T): T {
  return asyncLocalStorage.run(logger, fn);
}

export function getRequestLogger(): Logger {
  return asyncLocalStorage.getStore() || logger;
}

// ============ MIDDLEWARE HELPERS ============

export function logMiddleware() {
  return (req: unknown, _res: unknown, next: () => void) => {
    const requestLogger = createRequestLogger({
      requestId: uuidv4(),
    });

    runWithLogger(requestLogger, () => {
      next();
    });
  };
}

// ============ PERFORMANCE TIMING ============

export function createTimer(): { stop: () => number } {
  const start = process.hrtime.bigint();
  return {
    stop: () => {
      const end = process.hrtime.bigint();
      return Number(end - start) / 1_000_000; // Convert to milliseconds
    },
  };
}

// ============ STRUCTURED ERROR LOGGING ============

export function logErrorWithContext(
  error: Error,
  context: LogContext,
  additionalInfo?: Record<string, unknown>
): void {
  const requestLogger = getRequestLogger();
  
  requestLogger.error(error.message, {
    ...context,
    ...additionalInfo,
    errorName: error.name,
    errorStack: error.stack,
  });
}

// ============ HEALTH CHECK LOGGING ============

export function logHealthCheck(status: 'healthy' | 'unhealthy', services: Record<string, boolean>): void {
  const level: LogLevel = status === 'healthy' ? 'info' : 'error';
  logger[level]('Health check', { status, services });
}

export default logger;
