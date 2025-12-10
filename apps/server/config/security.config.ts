// ==============================================
// PLUGSPACE.IO TITAN v1.4 - SECURITY CONFIGURATION
// ==============================================

export const securityConfig = {
  // CORS settings
  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
    allowedMethods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },

  // Rate limiting by tier
  rateLimits: {
    free: { requests: 100, windowSeconds: 3600 },
    starter: { requests: 500, windowSeconds: 3600 },
    professional: { requests: 2000, windowSeconds: 3600 },
    enterprise: { requests: 10000, windowSeconds: 3600 },
  },

  // Connection limits
  connections: {
    maxPerUser: parseInt(process.env.MAX_SESSIONS_PER_USER || '3', 10),
    maxPerOrganization: 50,
    maxGlobal: 10000,
    sessionTimeout: 3600000, // 1 hour
    idleTimeout: 600000, // 10 minutes
  },

  // Authentication
  authentication: {
    tokenExpiry: 3600, // seconds
    refreshTokenExpiry: 604800, // 7 days
    requireVerifiedEmail: false,
  },

  // IP security
  ipSecurity: {
    enabled: process.env.IP_WHITELIST_ENABLED === 'true',
    blockedIPs: (process.env.BLOCKED_IPS || '').split(',').filter(Boolean),
    allowedIPs: (process.env.ALLOWED_IPS || '').split(',').filter(Boolean),
    maxFailedAttempts: 5,
    lockoutDuration: 900, // 15 minutes
  },

  // Data protection
  dataProtection: {
    encryptAudio: process.env.ENCRYPT_AUDIO === 'true',
    audioRetention: 0, // Don't retain audio by default
    transcriptRetention: 86400, // 24 hours
    gdprCompliant: true,
    anonymizeIPs: process.env.NODE_ENV === 'production',
  },

  // Headers
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'",
  },

  // WebSocket security
  websocket: {
    pingInterval: 30000,
    pongTimeout: 10000,
    closeTimeout: 5000,
    maxPayload: 1048576, // 1MB
    perMessageDeflate: true,
  },

  // Audit logging
  audit: {
    enabled: true,
    logConnections: true,
    logDisconnections: true,
    logAuthFailures: true,
    logRateLimits: true,
    retentionDays: 90,
  },
};

export default securityConfig;
