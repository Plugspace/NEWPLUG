// ==============================================
// PLUGSPACE.IO TITAN v1.4 - WEBSOCKET SECURITY
// ==============================================
// Authentication, authorization, rate limiting,
// and multi-tenant isolation for voice connections
// ==============================================

import { Redis } from 'ioredis';
import * as admin from 'firebase-admin';
import { logger } from './logger';

// ============ TYPES ============

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName?: string;
  role: string;
  organizationId?: string;
  permissions: string[];
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
}

export interface ConnectionSecurityConfig {
  maxConnectionsPerUser: number;
  maxConnectionsPerOrg: number;
  rateLimitWindow: number; // seconds
  rateLimitMax: number;
  ipWhitelistEnabled: boolean;
  deviceAuthEnabled: boolean;
}

// ============ SECURITY MANAGER ============

export class SecurityManager {
  private redis: Redis;
  private config: ConnectionSecurityConfig;
  private firebaseInitialized: boolean = false;

  // Rate limit configuration by tier
  private readonly TIER_LIMITS: Record<string, { requests: number; window: number }> = {
    free: { requests: 100, window: 3600 },        // 100/hour
    starter: { requests: 500, window: 3600 },     // 500/hour
    professional: { requests: 2000, window: 3600 }, // 2000/hour
    enterprise: { requests: 10000, window: 3600 }, // 10000/hour
  };

  constructor(redis: Redis, config?: Partial<ConnectionSecurityConfig>) {
    this.redis = redis;
    this.config = {
      maxConnectionsPerUser: 3,
      maxConnectionsPerOrg: 50,
      rateLimitWindow: 60,
      rateLimitMax: 60,
      ipWhitelistEnabled: false,
      deviceAuthEnabled: false,
      ...config,
    };

    this.initializeFirebase();
  }

  // ============ FIREBASE INITIALIZATION ============

  private initializeFirebase(): void {
    if (!admin.apps.length) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
        this.firebaseInitialized = true;
        logger.info('Firebase Admin initialized');
      } catch (error) {
        logger.error('Firebase initialization failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else {
      this.firebaseInitialized = true;
    }
  }

  // ============ AUTHENTICATION ============

  async authenticate(token: string): Promise<AuthResult> {
    if (!token) {
      return { success: false, error: 'Token required' };
    }

    try {
      // Verify Firebase token
      const decodedToken = await this.verifyFirebaseToken(token);
      if (!decodedToken) {
        return { success: false, error: 'Invalid token' };
      }

      // Get user data
      const user = await this.getUserFromToken(decodedToken);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Check if user is active
      if (!await this.isUserActive(user.id)) {
        return { success: false, error: 'Account inactive' };
      }

      logger.info('User authenticated', { userId: user.id, email: user.email });

      return { success: true, user };

    } catch (error) {
      logger.error('Authentication error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { success: false, error: 'Authentication failed' };
    }
  }

  async verifyFirebaseToken(token: string): Promise<admin.auth.DecodedIdToken | null> {
    if (!this.firebaseInitialized) {
      logger.error('Firebase not initialized');
      return null;
    }

    try {
      return await admin.auth().verifyIdToken(token);
    } catch (error) {
      logger.warn('Token verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  private async getUserFromToken(
    decodedToken: admin.auth.DecodedIdToken
  ): Promise<AuthenticatedUser | null> {
    try {
      // Get user from cache first
      const cacheKey = `plugspace:user:${decodedToken.uid}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Get Firebase user
      const firebaseUser = await admin.auth().getUser(decodedToken.uid);

      // Get custom claims (role, org, permissions)
      const claims = firebaseUser.customClaims || {};

      const user: AuthenticatedUser = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || undefined,
        role: claims.role || 'user',
        organizationId: claims.organizationId,
        permissions: claims.permissions || [],
      };

      // Cache for 5 minutes
      await this.redis.setex(cacheKey, 300, JSON.stringify(user));

      return user;

    } catch (error) {
      logger.error('Failed to get user from token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  private async isUserActive(userId: string): Promise<boolean> {
    const key = `plugspace:user:${userId}:status`;
    const status = await this.redis.get(key);
    
    // If no status set, assume active
    if (!status) return true;
    
    return status === 'active';
  }

  // ============ AUTHORIZATION ============

  async verifyOrganizationAccess(userId: string, organizationId: string): Promise<boolean> {
    const key = `plugspace:org:${organizationId}:members`;
    const isMember = await this.redis.sismember(key, userId);
    return isMember === 1;
  }

  async verifyProjectAccess(userId: string, projectId: string): Promise<boolean> {
    const key = `plugspace:project:${projectId}:members`;
    const isMember = await this.redis.sismember(key, userId);
    return isMember === 1;
  }

  hasPermission(user: AuthenticatedUser, permission: string): boolean {
    // Admin has all permissions
    if (user.role === 'admin' || user.role === 'MASTER_ADMIN') {
      return true;
    }

    return user.permissions.includes(permission);
  }

  // ============ RATE LIMITING ============

  async checkRateLimit(
    userId: string,
    tier: string = 'free'
  ): Promise<RateLimitResult> {
    const limits = this.TIER_LIMITS[tier] || this.TIER_LIMITS.free;
    const key = `plugspace:ratelimit:voice:${userId}`;
    
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - limits.window;

    // Remove old entries
    await this.redis.zremrangebyscore(key, 0, windowStart);

    // Count current requests
    const count = await this.redis.zcard(key);

    if (count >= limits.requests) {
      // Get oldest entry to calculate reset time
      const oldest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetAt = oldest.length > 1 
        ? new Date((parseInt(oldest[1]) + limits.window) * 1000)
        : new Date((now + limits.window) * 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        limit: limits.requests,
      };
    }

    // Add current request
    await this.redis.zadd(key, now, `${now}:${Math.random()}`);
    await this.redis.expire(key, limits.window);

    return {
      allowed: true,
      remaining: limits.requests - count - 1,
      resetAt: new Date((now + limits.window) * 1000),
      limit: limits.requests,
    };
  }

  // ============ ORIGIN VALIDATION ============

  validateOrigin(origin: string, allowedOrigins: string[]): boolean {
    if (!origin) {
      // Allow connections without origin (e.g., from mobile apps)
      return process.env.NODE_ENV !== 'production';
    }

    // Exact match
    if (allowedOrigins.includes(origin)) {
      return true;
    }

    // Wildcard subdomain matching
    for (const allowed of allowedOrigins) {
      if (allowed.startsWith('*.')) {
        const domain = allowed.slice(2);
        const originHost = new URL(origin).hostname;
        if (originHost.endsWith(domain) || originHost === domain) {
          return true;
        }
      }
    }

    return false;
  }

  // ============ IP VALIDATION ============

  async validateIPAddress(ip: string, userId: string): Promise<boolean> {
    if (!this.config.ipWhitelistEnabled) {
      return true;
    }

    // Check user-specific whitelist
    const userKey = `plugspace:user:${userId}:ip_whitelist`;
    const isWhitelisted = await this.redis.sismember(userKey, ip);
    
    if (isWhitelisted === 1) {
      return true;
    }

    // Check global whitelist
    const globalKey = 'plugspace:global:ip_whitelist';
    const isGlobalWhitelisted = await this.redis.sismember(globalKey, ip);

    return isGlobalWhitelisted === 1;
  }

  // ============ DEVICE AUTHORIZATION ============

  async authorizeDevice(deviceId: string, userId: string): Promise<boolean> {
    if (!this.config.deviceAuthEnabled) {
      return true;
    }

    const key = `plugspace:user:${userId}:devices`;
    const isAuthorized = await this.redis.sismember(key, deviceId);
    return isAuthorized === 1;
  }

  async registerDevice(deviceId: string, userId: string): Promise<void> {
    const key = `plugspace:user:${userId}:devices`;
    await this.redis.sadd(key, deviceId);
  }

  // ============ CONNECTION LIMITS ============

  async checkConnectionLimit(
    userId: string,
    organizationId?: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check user limit
    const userKey = `plugspace:voice:connections:user:${userId}`;
    const userConnections = parseInt(await this.redis.get(userKey) || '0');
    
    if (userConnections >= this.config.maxConnectionsPerUser) {
      return { allowed: false, reason: 'User connection limit reached' };
    }

    // Check organization limit
    if (organizationId) {
      const orgKey = `plugspace:voice:connections:org:${organizationId}`;
      const orgConnections = parseInt(await this.redis.get(orgKey) || '0');
      
      if (orgConnections >= this.config.maxConnectionsPerOrg) {
        return { allowed: false, reason: 'Organization connection limit reached' };
      }
    }

    return { allowed: true };
  }

  async incrementConnection(userId: string, organizationId?: string): Promise<void> {
    const userKey = `plugspace:voice:connections:user:${userId}`;
    await this.redis.incr(userKey);
    await this.redis.expire(userKey, 3600);

    if (organizationId) {
      const orgKey = `plugspace:voice:connections:org:${organizationId}`;
      await this.redis.incr(orgKey);
      await this.redis.expire(orgKey, 3600);
    }
  }

  async decrementConnection(userId: string, organizationId?: string): Promise<void> {
    const userKey = `plugspace:voice:connections:user:${userId}`;
    await this.redis.decr(userKey);

    if (organizationId) {
      const orgKey = `plugspace:voice:connections:org:${organizationId}`;
      await this.redis.decr(orgKey);
    }
  }

  // ============ SUSPICIOUS ACTIVITY ============

  async recordSuspiciousActivity(
    userId: string,
    activity: string,
    details: Record<string, unknown>
  ): Promise<void> {
    const key = `plugspace:security:suspicious:${userId}`;
    const entry = JSON.stringify({
      activity,
      details,
      timestamp: new Date().toISOString(),
    });

    await this.redis.lpush(key, entry);
    await this.redis.ltrim(key, 0, 99); // Keep last 100
    await this.redis.expire(key, 86400 * 7); // 7 days

    logger.warn('Suspicious activity recorded', { userId, activity, details });
  }

  async getSuspiciousActivityCount(userId: string): Promise<number> {
    const key = `plugspace:security:suspicious:${userId}`;
    return await this.redis.llen(key);
  }

  // ============ AUDIT LOGGING ============

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    const key = `plugspace:security:audit:${event.userId}`;
    const entry = JSON.stringify({
      ...event,
      timestamp: new Date().toISOString(),
    });

    await this.redis.lpush(key, entry);
    await this.redis.ltrim(key, 0, 999); // Keep last 1000
    await this.redis.expire(key, 86400 * 30); // 30 days

    logger.info('Security event logged', event);
  }
}

// ============ INTERFACES ============

interface SecurityEvent {
  userId: string;
  eventType: 'login' | 'logout' | 'auth_failure' | 'rate_limit' | 'suspicious';
  ipAddress: string;
  userAgent: string;
  details?: Record<string, unknown>;
}

export interface ConnectionSecurity {
  authenticate(token: string): Promise<AuthResult>;
  verifyFirebaseToken(token: string): Promise<any>;
  verifyOrganizationAccess(userId: string, orgId: string): Promise<boolean>;
  checkRateLimit(userId: string): Promise<RateLimitResult>;
  validateIPAddress(ip: string, userId: string): Promise<boolean>;
  authorizeDevice(deviceId: string, userId: string): Promise<boolean>;
}

export default SecurityManager;
