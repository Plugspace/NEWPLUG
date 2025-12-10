# Plugspace.io Titan v1.4 - System Architecture

## Overview

Plugspace.io Titan is an enterprise-grade, voice-first AI coding platform designed for scalability, reliability, and performance. This document outlines the system architecture, design decisions, and key components.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NGINX REVERSE PROXY                                │
│                    (SSL Termination, Load Balancing)                         │
│    Port 80/443 → HTTP/HTTPS                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
           │                    │                    │                    │
           ▼                    ▼                    ▼                    ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Landing   │       │   Studio    │       │   Admin     │       │    API      │
│  (Next.js)  │       │  (Next.js)  │       │  (Next.js)  │       │   (tRPC)    │
│  Port 3000  │       │  Port 3001  │       │  Port 3002  │       │  Port 4000  │
└─────────────┘       └─────────────┘       └─────────────┘       └─────────────┘
                                                                        │
                                                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SERVICE LAYER                                     │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────────────┤
│    Auth     │   Project   │     AI      │  Template   │     Analytics       │
│   Service   │   Service   │   Service   │   Service   │     Service         │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   AI Agents     │       │    Firebase     │       │  External APIs  │
├─────────────────┤       │  (Auth/Storage) │       ├─────────────────┤
│ Don (Architect) │       └─────────────────┘       │ Anthropic Claude│
│ Mark (Developer)│                                  │ Google Gemini   │
│ Jessica(Design) │                                  │ Stripe          │
│ Sherlock(Clone) │                                  │ SendGrid        │
│ Zara (Voice)    │                                  └─────────────────┘
└─────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    MongoDB      │       │     Redis       │       │   Job Queue     │
│  (Replica Set)  │       │   (Sentinel)    │       │   (Bull MQ)     │
│                 │       │                 │       │                 │
│ Primary         │       │ Master          │       │ Workers         │
│ Secondary 1     │       │ Replica         │       │ Schedulers      │
│ Secondary 2     │       │ Sentinel        │       │                 │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

## Technology Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript 5.3+** - Type-safe development
- **Tailwind CSS 3.4+** - Utility-first styling
- **Zustand** - State management
- **TanStack Query** - Data fetching and caching
- **React Hook Form + Zod** - Form handling and validation

### Backend
- **Node.js 20 LTS** - Runtime environment
- **TypeScript 5.3+** - Strict mode enabled
- **tRPC 10+** - Type-safe API layer
- **Prisma** - Database ORM with MongoDB
- **Bull** - Job queue with Redis

### Database
- **MongoDB 7** - Primary database (replica set)
- **Redis 7** - Caching, sessions, rate limiting, queues

### AI Integration
- **Anthropic Claude Sonnet 4.5** - Primary AI model for agents
- **Google Gemini 3.0** - Multimodal capabilities
- **Google Gemini Live API** - Voice interactions

### Infrastructure
- **Docker & Docker Compose** - Containerization
- **Nginx** - Reverse proxy and load balancer
- **PM2** - Process manager
- **Let's Encrypt** - SSL certificates
- **Prometheus + Grafana** - Monitoring

## Multi-Tenant Architecture

### Tenant Isolation

Every resource in the system is scoped to an organization:

```typescript
// All queries automatically filtered by organizationId
const projects = await prisma.project.findMany({
  where: { organizationId: ctx.organizationId }
});
```

### Isolation Layers

1. **Database Level**
   - All models include `organizationId`
   - Prisma middleware enforces tenant context
   - Indexes optimized for tenant queries

2. **API Level**
   - tRPC context includes organization
   - All procedures validate tenant access
   - Rate limiting per organization

3. **File Storage**
   - Separate paths per organization
   - Pre-signed URLs with organization validation

4. **Cache Level**
   - Redis namespaces per organization
   - Session isolation

## Security Architecture

### Authentication Flow

```
┌────────┐      ┌─────────┐      ┌───────────┐      ┌──────────┐
│ Client │─────▶│ Firebase │─────▶│  API      │─────▶│ MongoDB  │
└────────┘      │  Auth    │      │  Verify   │      │  Sync    │
                └─────────┘      └───────────┘      └──────────┘
                     │                 │
                     ▼                 ▼
              ┌───────────┐    ┌─────────────┐
              │   JWT     │    │   Session   │
              │   Token   │    │   Store     │
              └───────────┘    └─────────────┘
```

### Security Features

- **JWT Authentication** - Token-based auth with refresh tokens
- **RBAC** - Role-based access control (User, Studio Admin, Master Admin)
- **MFA** - TOTP, SMS, and email verification
- **Rate Limiting** - Per-user and per-organization limits
- **Input Validation** - Zod schemas on all inputs
- **Output Sanitization** - XSS prevention
- **Encryption** - AES-256 for sensitive data at rest
- **TLS 1.3** - All connections encrypted in transit

## Error Handling

### Error Categories

| Category | Code Range | HTTP Status | Retry |
|----------|------------|-------------|-------|
| Authentication | AUTH_xxx | 401 | No |
| Authorization | AUTHZ_xxx | 403 | No |
| Validation | VAL_xxx | 400 | No |
| Resource | RES_xxx | 404/409/410 | No |
| Rate Limiting | RATE_xxx | 429 | Yes |
| Server | SRV_xxx | 500/502/503 | Yes |
| AI Services | AI_xxx | 500 | Yes |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "AUTH_001",
    "message": "Authentication required",
    "details": {},
    "requestId": "req_abc123",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "suggestion": "Please log in to access this resource.",
    "documentationUrl": "https://docs.plugspace.io/errors/authentication"
  }
}
```

## Data Flow

### Request Lifecycle

```
1. Client Request
   ↓
2. Nginx (SSL, Rate Limit)
   ↓
3. Next.js / tRPC Handler
   ↓
4. Authentication Middleware
   ↓
5. Authorization Check
   ↓
6. Input Validation (Zod)
   ↓
7. Business Logic
   ↓
8. Database Operation (Prisma)
   ↓
9. Response Serialization
   ↓
10. Client Response
```

### AI Agent Pipeline

```
User Input
    ↓
┌─────────────────┐
│   Zara (Voice)  │ ← Voice to text
└────────┬────────┘
         ▼
┌─────────────────┐
│ Don (Architect) │ ← Generate architecture
└────────┬────────┘
         ▼
┌─────────────────┐
│ Jessica(Design) │ ← Create design system
└────────┬────────┘
         ▼
┌─────────────────┐
│ Mark(Developer) │ ← Generate code
└────────┬────────┘
         ▼
    Output
```

## Scaling Strategy

### Horizontal Scaling

```yaml
# Docker Compose scaling
docker compose up -d --scale api=3 --scale landing=2
```

### Load Balancing

Nginx upstream configuration:

```nginx
upstream api_backend {
    least_conn;
    server api1:4000 weight=5;
    server api2:4000 weight=5;
    server api3:4000 weight=5;
}
```

### Database Scaling

- **Read Replicas** - MongoDB secondary nodes for read operations
- **Sharding** - Future capability for horizontal partitioning
- **Connection Pooling** - Optimized connection management

## Monitoring & Observability

### Metrics Collection

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Application │───▶│  Prometheus  │───▶│   Grafana    │
└──────────────┘    └──────────────┘    └──────────────┘
       │                   │
       ▼                   ▼
┌──────────────┐    ┌──────────────┐
│    Loki      │    │ Alertmanager │
│   (Logs)     │    │  (Alerts)    │
└──────────────┘    └──────────────┘
```

### Key Metrics

- **Application**: Request rate, error rate, latency (p50, p95, p99)
- **Database**: Query performance, connection pool, replication lag
- **Infrastructure**: CPU, memory, disk, network
- **Business**: Active users, AI credits, project deployments

## Deployment Pipeline

### CI/CD Flow

```
Code Push → GitHub Actions → Build → Test → Deploy
              │
              ├── Lint & Type Check
              ├── Unit Tests
              ├── Integration Tests
              ├── Security Scan
              └── Docker Build
                    │
                    ▼
              ┌─────────┐
              │ Staging │ → Manual Approval → Production
              └─────────┘
```

### Zero-Downtime Deployment

```bash
# Rolling deployment
for service in api landing studio admin; do
    docker compose up -d --no-deps --build $service
    sleep 30  # Wait for health check
done
```

## Disaster Recovery

### Backup Strategy

| Type | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| Full Database | Daily | 30 days | S3/Local |
| Incremental | Hourly | 7 days | S3/Local |
| Transaction Logs | Continuous | 7 days | S3/Local |

### Recovery Objectives

- **RTO** (Recovery Time Objective): < 1 hour
- **RPO** (Recovery Point Objective): < 1 hour

### Recovery Procedures

1. **Single Service Failure**: Automatic restart via PM2/Docker
2. **Database Failure**: Automatic failover to replica
3. **Complete Failure**: Restore from backup to new infrastructure

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time (p95) | < 100ms | TBD |
| Page Load Time | < 2s | TBD |
| Time to First Byte | < 200ms | TBD |
| Uptime SLA | 99.9% | TBD |
| Concurrent Users | 10,000+ | TBD |

## Compliance

### SOC 2 Readiness

- [ ] Access controls
- [ ] Encryption at rest and in transit
- [ ] Audit logging
- [ ] Change management
- [ ] Incident response

### GDPR Compliance

- [ ] Data processing agreements
- [ ] Right to access (data export)
- [ ] Right to deletion
- [ ] Data portability
- [ ] Consent management
