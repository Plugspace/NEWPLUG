// ==============================================
// PLUGSPACE.IO TITAN v1.4 - VOICE SERVER LOGGER
// ==============================================
// Structured logging for voice server operations
// ==============================================

import winston from 'winston';

const { combine, timestamp, printf, colorize, json } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
  return `${timestamp} [${level}] ${message} ${metaStr}`;
});

// Determine log level from environment
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create logger instance
export const logger = winston.createLogger({
  level: logLevel,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    process.env.NODE_ENV === 'production' ? json() : combine(colorize(), devFormat)
  ),
  defaultMeta: { service: 'voice-server' },
  transports: [
    new winston.transports.Console(),
  ],
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: '/var/log/plugspace/voice-error.log',
    level: 'error',
    maxsize: 10485760, // 10MB
    maxFiles: 5,
  }));
  
  logger.add(new winston.transports.File({
    filename: '/var/log/plugspace/voice-combined.log',
    maxsize: 10485760,
    maxFiles: 10,
  }));
}

export default logger;
