# Plugspace.io Titan v1.4 - Architecture Documentation

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                             │
├─────────────┬─────────────────┬──────────────────────────────┤
│  Landing    │  User Studio    │  Master Admin                │
│  (Next.js)  │  (Next.js)      │  (Next.js)                   │
│  Port 3000  │  Port 3001      │  Port 3002                   │
└─────────────┴─────────────────┴──────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              NGINX REVERSE PROXY (443/80)                    │
│  SSL/TLS Termination │ Load Balancing │ Rate Limiting       │
└─────────────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   API LAYER (tRPC)                           │
│  Backend Server (Port 3001) │ Voice Server (Port 8080)      │
└─────────────────────────────────────────────────────────────┘
                        ▼
┌──────────────┬──────────────────┬──────────────────────────┐
│   FIREBASE   │   REDIS QUEUE     │   AI AGENTS LAYER       │
│   Auth       │   Task Manager    │   Don/Mark/Jessica/     │
│              │                  │   Sherlock/Zara         │
└──────────────┴──────────────────┴──────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATA LAYER                                 │
│  MongoDB 7 Replica Set  │  Redis 7 Cluster                  │
│  Multi-Tenant Isolation │  Session + Cache Storage          │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Multi-Tenant Isolation

### Database Level

Every collection includes `organizationId`:
```typescript
model Project {
  organizationId String @db.ObjectId
  // ... other fields
  @@index([organizationId, userId])
}
```

**Enforcement**:
- Compound indexes ensure efficient queries
- Middleware auto-injects organization context
- No cross-tenant queries possible

### API Level

tRPC context includes `organizationId`:
```typescript
export interface Context {
  organizationId?: string;
  userId?: string;
  // ...
}
```

**Enforcement**:
- `protectedProcedure` requires authentication
- `withOrganization` middleware validates membership
- Rate limiting per organization
- Resource quotas enforced

### File Storage

- Separate directories per organization
- Subdomain-based routing: `{project}.projects.plugspace.io`
- Isolated CDN paths

## 🤖 AI Agents Architecture

### Agent Don (Architecture)
- **Model**: Claude Sonnet 4.5
- **Input**: User prompt describing desired website
- **Output**: ArchitectureOutput (components, pages, data flow, tech stack)
- **Process**: Analyzes requirements → Generates architecture → Validates structure

### Agent Mark (Code Generation)
- **Model**: Claude Sonnet 4.5
- **Input**: Architecture + Design
- **Output**: Complete codebase (files, dependencies, configs)
- **Process**: Architecture → Code generation → File structure → Dependencies

### Agent Jessica (Design System)
- **Model**: Gemini 3.0 Pro Vision
- **Input**: Architecture or reference images
- **Output**: DesignOutput (colors, typography, spacing, components)
- **Process**: Visual analysis → Design extraction → System generation

### Agent Sherlock (Website Cloning)
- **Model**: Claude Sonnet 4.5
- **Input**: Target website URL
- **Output**: CloneAnalysis (structure, styles, content)
- **Process**: Scrape website → Analyze structure → Extract design → Generate clone

### Agent Zara (Voice Processing)
- **Model**: Gemini Live API
- **Input**: Real-time audio stream
- **Output**: Transcript + Intent + Entities
- **Process**: Audio → Transcription → Intent parsing → Command routing

## 📊 Data Flow

### Project Creation Flow

```
User Voice Command
    ↓
Agent Zara (Voice → Text)
    ↓
Agent Don (Text → Architecture)
    ↓
Agent Jessica (Architecture → Design)
    ↓
Agent Mark (Architecture + Design → Code)
    ↓
Project Published
```

### Multi-Tenant Query Flow

```
User Request
    ↓
Firebase Auth (Verify Token)
    ↓
tRPC Context (Extract organizationId)
    ↓
Database Query (Auto-inject organizationId filter)
    ↓
Response (Scoped to organization)
```

## 🚀 Performance Optimizations

### Caching Strategy

1. **Redis Cache**:
   - Template listings (5 min TTL)
   - User sessions (24 hour TTL)
   - Organization configs (1 hour TTL)

2. **CDN**:
   - Static assets
   - Template previews
   - Published project files

### Database Optimization

1. **Indexes**:
   - Compound indexes on `(organizationId, userId)`
   - Single indexes on frequently queried fields
   - Text indexes for search

2. **Query Optimization**:
   - Projection to limit fields
   - Pagination for large datasets
   - Aggregation pipelines for analytics

### API Optimization

1. **Rate Limiting**:
   - 100 requests/minute per IP
   - 1000 requests/hour per organization

2. **Response Compression**:
   - Gzip enabled in Nginx
   - JSON minification

## 🔒 Security Architecture

### Authentication Flow

```
Client → Firebase Auth → ID Token
    ↓
Backend → Verify Token → Extract UID
    ↓
Database → Lookup User → Get Organization
    ↓
tRPC Context → Set organizationId
```

### Authorization Levels

1. **Public**: No authentication required
   - Template listings
   - Public project views

2. **Authenticated**: User must be logged in
   - Project CRUD
   - User profile

3. **Master Admin**: Restricted to `plugspaceapp@gmail.com`
   - System configuration
   - User management
   - Analytics dashboard

### Security Measures

- **Input Validation**: Zod schemas for all inputs
- **SQL Injection**: Prisma parameterized queries
- **XSS Protection**: React auto-escaping, CSP headers
- **CSRF Protection**: SameSite cookies, token validation
- **Rate Limiting**: Per-IP and per-organization limits
- **Security Headers**: HSTS, X-Frame-Options, CSP

## 📈 Scalability Considerations

### Horizontal Scaling

- **Stateless API**: All apps can scale horizontally
- **PM2 Cluster Mode**: Utilizes all CPU cores
- **Load Balancing**: Nginx distributes requests
- **Database Replication**: MongoDB replica sets

### Vertical Scaling

- **Resource Limits**: PM2 memory limits prevent OOM
- **Connection Pooling**: MongoDB connection pooling
- **Redis Clustering**: Distributed cache

### Future Enhancements

- **Microservices**: Split agents into separate services
- **Message Queue**: RabbitMQ/Kafka for async processing
- **Service Mesh**: Istio for service-to-service communication
- **Multi-Region**: Deploy to multiple regions for latency

## 🔍 Monitoring & Observability

### Logging

- **Winston**: Structured JSON logging
- **Log Levels**: error, warn, info, debug
- **Log Rotation**: PM2 log rotation
- **Centralized Logging**: (Future) ELK stack

### Metrics

- **Application Metrics**: Request count, latency, error rate
- **System Metrics**: CPU, memory, disk usage
- **Database Metrics**: Query performance, connection pool
- **Business Metrics**: User signups, projects created, API usage

### Alerting

- **Uptime Monitoring**: External service (UptimeRobot)
- **Error Tracking**: (Future) Sentry integration
- **Performance Alerts**: (Future) Prometheus alerts

## 🧪 Testing Strategy

### Unit Tests
- Utility functions
- Business logic
- Data transformations

### Integration Tests
- API endpoints
- Database operations
- Authentication flows

### E2E Tests
- User registration flow
- Project creation flow
- Voice command flow
- Publish flow

## 📚 Technology Decisions

### Why tRPC?
- Type-safe APIs end-to-end
- No code generation needed
- Excellent DX with autocomplete
- Built-in error handling

### Why MongoDB?
- Flexible schema for AI-generated content
- JSON storage for architecture/design/code
- Horizontal scaling
- Multi-tenant friendly

### Why Next.js 15?
- App Router for modern React patterns
- Server components for performance
- Built-in optimizations
- Excellent DX

### Why PM2?
- Process management
- Cluster mode for multi-core
- Auto-restart on crashes
- Built-in monitoring
