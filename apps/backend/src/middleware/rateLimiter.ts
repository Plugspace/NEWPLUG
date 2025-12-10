/**
 * Rate limiting middleware
 * Uses Redis for distributed rate limiting
 */

import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { logger } from '../utils/logger';

let redis: Redis | null = null;

// Initialize Redis connection
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redis.on('error', (err) => {
    logger.error('Redis connection error', { error: err.message });
  });
}

/**
 * Rate limiter middleware
 * Limits: 100 requests per minute per IP
 */
export async function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Skip rate limiting if Redis is not available
  if (!redis) {
    return next();
  }

  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `rate_limit:${ip}`;
    const limit = 100; // requests
    const window = 60; // seconds

    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.expire(key, window);
    }

    if (current > limit) {
      logger.warn('Rate limit exceeded', { ip, current, limit });
      return res.status(429).json({
        error: {
          message: 'Too many requests. Please try again later.',
          retryAfter: window,
        },
      });
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - current).toString());
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + window * 1000).toISOString());

    next();
  } catch (error) {
    logger.error('Rate limiter error', { error: (error as Error).message });
    // Fail open - allow request if rate limiter fails
    next();
  }
}
