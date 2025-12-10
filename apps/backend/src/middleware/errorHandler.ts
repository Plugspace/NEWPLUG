/**
 * Global error handler middleware
 */

import { Request, Response, NextFunction } from 'express';
import { TRPCError } from '@trpc/server';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error | TRPCError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  if (err instanceof TRPCError) {
    return res.status(400).json({
      error: {
        message: err.message,
        code: err.code,
      },
    });
  }

  res.status(500).json({
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message,
    },
  });
}
