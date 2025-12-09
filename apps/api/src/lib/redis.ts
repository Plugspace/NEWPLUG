// ==============================================
// PLUGSPACE.IO TITAN v1.4 - REDIS CLIENT
// ==============================================

import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
});

redis.on('connect', () => {
  console.info('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

redis.on('close', () => {
  console.warn('⚠️ Redis connection closed');
});

// ============ CACHE HELPERS ============

export async function getCache<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return data as unknown as T;
  }
}

export async function setCache(
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<void> {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  if (ttlSeconds) {
    await redis.setex(key, ttlSeconds, serialized);
  } else {
    await redis.set(key, serialized);
  }
}

export async function deleteCache(key: string): Promise<void> {
  await redis.del(key);
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

// ============ SESSION MANAGEMENT ============

const SESSION_PREFIX = 'session:';
const SESSION_TTL = 86400; // 24 hours

export async function createSession(
  userId: string,
  data: Record<string, unknown>
): Promise<string> {
  const sessionId = `${SESSION_PREFIX}${userId}:${Date.now()}`;
  await setCache(sessionId, { ...data, userId, createdAt: new Date().toISOString() }, SESSION_TTL);
  return sessionId;
}

export async function getSession(sessionId: string): Promise<Record<string, unknown> | null> {
  return getCache<Record<string, unknown>>(sessionId);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await deleteCache(sessionId);
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  await deleteCachePattern(`${SESSION_PREFIX}${userId}:*`);
}

// ============ RATE LIMITING ============

const RATE_LIMIT_PREFIX = 'ratelimit:';

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const fullKey = `${RATE_LIMIT_PREFIX}${key}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  // Remove old entries
  await redis.zremrangebyscore(fullKey, 0, windowStart);

  // Count current requests
  const count = await redis.zcard(fullKey);

  if (count >= maxRequests) {
    const oldestEntry = await redis.zrange(fullKey, 0, 0, 'WITHSCORES');
    const resetAt = oldestEntry.length > 1
      ? parseInt(oldestEntry[1]!, 10) + windowSeconds * 1000
      : now + windowSeconds * 1000;

    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Add new entry
  await redis.zadd(fullKey, now, `${now}`);
  await redis.expire(fullKey, windowSeconds);

  return {
    allowed: true,
    remaining: maxRequests - count - 1,
    resetAt: now + windowSeconds * 1000,
  };
}

// ============ ORGANIZATION NAMESPACES ============

export function getOrgKey(organizationId: string, key: string): string {
  return `org:${organizationId}:${key}`;
}

export async function getOrgCache<T>(
  organizationId: string,
  key: string
): Promise<T | null> {
  return getCache<T>(getOrgKey(organizationId, key));
}

export async function setOrgCache(
  organizationId: string,
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<void> {
  await setCache(getOrgKey(organizationId, key), value, ttlSeconds);
}

export async function deleteOrgCache(
  organizationId: string,
  key: string
): Promise<void> {
  await deleteCache(getOrgKey(organizationId, key));
}

// ============ PUBSUB ============

export async function publish(channel: string, message: unknown): Promise<void> {
  const serialized = typeof message === 'string' ? message : JSON.stringify(message);
  await redis.publish(channel, serialized);
}

export function subscribe(
  channel: string,
  callback: (message: string) => void
): () => void {
  const subscriber = redis.duplicate();
  subscriber.subscribe(channel);
  subscriber.on('message', (_channel, message) => {
    callback(message);
  });

  return () => {
    subscriber.unsubscribe(channel);
    subscriber.disconnect();
  };
}
