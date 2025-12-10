# Plugspace.io Titan v1.4 - Security Documentation

## Overview

This document outlines the security measures, best practices, and compliance requirements for Plugspace.io Titan.

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────┐
│                    Layer 1: Network                          │
│         Firewall, DDoS Protection, WAF, SSL/TLS             │
├─────────────────────────────────────────────────────────────┤
│                    Layer 2: Application                      │
│    Authentication, Authorization, Input Validation           │
├─────────────────────────────────────────────────────────────┤
│                    Layer 3: Data                             │
│         Encryption at Rest, Access Control, Masking          │
├─────────────────────────────────────────────────────────────┤
│                    Layer 4: Infrastructure                   │
│      Hardened OS, Container Security, Secret Management      │
└─────────────────────────────────────────────────────────────┘
```

## Authentication

### Firebase Authentication

Firebase handles user authentication with support for:
- Email/password authentication
- OAuth providers (Google, GitHub, Microsoft)
- Phone number authentication
- Anonymous authentication (for demo)

### Token Management

```typescript
// Token structure
interface TokenPayload {
  uid: string;           // Firebase user ID
  email: string;         // User email
  role: Role;           // User role
  organizationId: string; // Tenant ID
  iat: number;          // Issued at
  exp: number;          // Expiration
}
```

### Session Management

- JWT tokens with 7-day expiration
- Refresh tokens with 30-day expiration
- Automatic token refresh
- Session invalidation on logout
- Device tracking and management

### Multi-Factor Authentication

Supported MFA methods:
- TOTP (Google Authenticator, Authy)
- SMS verification (via Twilio)
- Email verification codes
- Backup codes (one-time use)

```typescript
// Enable MFA
await user.enableMFA({
  method: 'TOTP',
  secret: generateTOTPSecret(),
});

// Verify MFA
const isValid = await user.verifyMFA({
  code: userProvidedCode,
});
```

## Authorization

### Role-Based Access Control (RBAC)

| Role | Description | Permissions |
|------|-------------|-------------|
| USER | Regular user | Own projects, limited settings |
| STUDIO_ADMIN | Organization admin | All org resources, user management |
| MASTER_ADMIN | Platform admin | Full system access |

### Permission Matrix

| Resource | USER | STUDIO_ADMIN | MASTER_ADMIN |
|----------|------|--------------|--------------|
| Own Projects | CRUD | CRUD | CRUD |
| Org Projects | R | CRUD | CRUD |
| Users | R(self) | RU | CRUD |
| Organization | R | RU | CRUD |
| System Config | - | R | CRUD |
| Billing | R | CRUD | CRUD |

### Multi-Tenant Isolation

```typescript
// Tenant context is enforced at every layer
const tenantMiddleware = async ({ ctx, next }) => {
  // Verify user belongs to organization
  if (ctx.user.organizationId !== ctx.params.organizationId) {
    throw new AuthorizationError('Cross-tenant access denied');
  }
  return next();
};

// Database queries automatically scoped
const projects = await prisma.project.findMany({
  where: {
    organizationId: ctx.organizationId, // Always filtered
  },
});
```

## Data Protection

### Encryption at Rest

- Database: MongoDB encryption at rest (AES-256)
- File storage: S3 server-side encryption (SSE-S3)
- Backups: Encrypted with customer-managed keys

### Encryption in Transit

- TLS 1.3 for all connections
- Certificate pinning for mobile apps
- HTTP Strict Transport Security (HSTS)

### Sensitive Data Handling

```typescript
// Fields encrypted in database
const sensitiveFields = [
  'mfaSecret',
  'backupCodes',
  'apiKeyHash',
  'webhookSecret',
];

// Encryption utility
function encryptField(value: string): string {
  return encrypt(value, process.env.ENCRYPTION_KEY);
}
```

### Data Masking

```typescript
// Mask sensitive data in logs
const maskedEmail = maskEmail('user@example.com');
// Output: u***@e***.com

// Mask API keys
const maskedKey = maskApiKey('sk_live_abc123xyz');
// Output: sk_live_***xyz
```

## Input Validation

### Schema Validation with Zod

```typescript
// All inputs validated with Zod schemas
const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  subdomain: z.string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Invalid subdomain format'),
});
```

### Sanitization

```typescript
// HTML sanitization for user content
import DOMPurify from 'dompurify';

const sanitizedContent = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ['p', 'b', 'i', 'a'],
  ALLOWED_ATTR: ['href'],
});
```

### SQL/NoSQL Injection Prevention

- Parameterized queries via Prisma ORM
- No raw query construction
- Input type validation

## Rate Limiting

### Configuration

```typescript
const rateLimits = {
  // General API
  api: {
    windowMs: 60 * 1000,    // 1 minute
    max: {
      FREE: 50,
      PRO: 200,
      BUSINESS: 500,
      ENTERPRISE: 2000,
    },
  },
  
  // AI endpoints
  ai: {
    windowMs: 60 * 1000,
    max: {
      FREE: 10,
      PRO: 50,
      BUSINESS: 200,
      ENTERPRISE: 1000,
    },
  },
  
  // Authentication
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,                   // 5 attempts
  },
};
```

### DDoS Protection

- Nginx rate limiting at proxy level
- Cloudflare DDoS protection (recommended)
- Geographic blocking for suspicious regions
- IP reputation checking

## Audit Logging

### Logged Events

| Event Category | Events |
|---------------|--------|
| Authentication | Login, logout, MFA challenge, password change |
| Authorization | Permission denied, role change |
| Data Access | Read, create, update, delete |
| Admin Actions | User management, system config |
| Security | Failed logins, suspicious activity |

### Log Format

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "req_abc123",
  "userId": "user_123",
  "organizationId": "org_456",
  "action": "project.create",
  "resource": "project",
  "resourceId": "proj_789",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "changes": {
    "name": { "from": null, "to": "My Project" }
  },
  "result": "success"
}
```

### Log Retention

| Log Type | Retention |
|----------|-----------|
| Security events | 2 years |
| Access logs | 90 days |
| Application logs | 30 days |
| Debug logs | 7 days |

## API Security

### API Key Management

```typescript
// API key generation
const apiKey = generateSecureApiKey();
// Format: pk_live_32_random_characters

// Storage
const hashedKey = await bcrypt.hash(apiKey, 12);
await prisma.apiKey.create({
  data: {
    keyPrefix: apiKey.slice(0, 8),
    keyHash: hashedKey,
    // ...
  },
});
```

### Webhook Security

```typescript
// Sign webhook payloads
function signWebhookPayload(payload: string, secret: string): string {
  return 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

// Verify webhook signature
function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expected = signWebhookPayload(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### CORS Configuration

```typescript
const corsOptions = {
  origin: [
    'https://plugspace.io',
    'https://studio.plugspace.io',
    'https://admin.plugspace.io',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  maxAge: 86400, // 24 hours
};
```

## Infrastructure Security

### Server Hardening

```bash
# Disable root login
PermitRootLogin no

# Use SSH keys only
PasswordAuthentication no

# Configure firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp  # SSH
ufw allow 80/tcp  # HTTP
ufw allow 443/tcp # HTTPS
ufw enable
```

### Container Security

```dockerfile
# Non-root user
USER node

# Read-only filesystem where possible
RUN chmod -R 555 /app

# Security options in docker-compose
security_opt:
  - no-new-privileges:true
cap_drop:
  - ALL
```

### Secret Management

- Environment variables for configuration
- Vault integration for production secrets (optional)
- Secret rotation schedule
- Never commit secrets to version control

## Vulnerability Management

### Dependency Scanning

```bash
# Regular dependency audits
npm audit

# Security scanning with Snyk
npx snyk test
```

### Code Analysis

- ESLint security rules
- SonarQube analysis
- GitHub Dependabot alerts

### Penetration Testing

- Annual third-party penetration tests
- Bug bounty program (planned)
- Regular security assessments

## Incident Response

### Response Procedure

1. **Detection**: Automated alerts or manual report
2. **Containment**: Isolate affected systems
3. **Eradication**: Remove threat
4. **Recovery**: Restore services
5. **Post-Incident**: Review and improve

### Contact

Security issues should be reported to: security@plugspace.io

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| Critical | Active exploitation, data breach | 1 hour |
| High | Severe vulnerability | 4 hours |
| Medium | Moderate vulnerability | 24 hours |
| Low | Minor issue | 72 hours |

## Compliance

### SOC 2 Type II

- [ ] Access controls
- [ ] Encryption requirements
- [ ] Audit logging
- [ ] Change management
- [ ] Incident response
- [ ] Vendor management

### GDPR

- [ ] Lawful basis for processing
- [ ] Data minimization
- [ ] Right to access
- [ ] Right to deletion
- [ ] Data portability
- [ ] Privacy by design
- [ ] Data protection officer

### Data Processing

```typescript
// Data export for GDPR compliance
async function exportUserData(userId: string): Promise<UserDataExport> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      projects: true,
      interactionLogs: true,
      activityLogs: true,
    },
  });
  
  return formatForExport(user);
}

// Data deletion
async function deleteUserData(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.interactionLog.deleteMany({ where: { userId } }),
    prisma.activityLog.deleteMany({ where: { userId } }),
    prisma.project.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
}
```

## Security Checklist

### Development

- [ ] Input validation on all endpoints
- [ ] Output encoding/escaping
- [ ] Parameterized database queries
- [ ] Secure session management
- [ ] Error messages don't leak information
- [ ] Dependencies up to date
- [ ] Security headers configured

### Deployment

- [ ] HTTPS enforced
- [ ] Secure cookie flags
- [ ] Rate limiting enabled
- [ ] Firewall configured
- [ ] SSH hardened
- [ ] Monitoring enabled
- [ ] Backups encrypted

### Operations

- [ ] Access logs reviewed
- [ ] Failed login alerts
- [ ] Dependency updates scheduled
- [ ] Incident response plan tested
- [ ] Security training completed
