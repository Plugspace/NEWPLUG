# Plugspace.io Titan v1.4 - API Documentation

## Overview

The Plugspace API is built with tRPC, providing end-to-end type safety between the client and server. All endpoints follow RESTful conventions while leveraging TypeScript for automatic type inference.

## Base URL

```
Production: https://api.plugspace.io
Staging: https://api.staging.plugspace.io
Development: http://localhost:4000
```

## Authentication

### Firebase Token Authentication

All API requests require a valid Firebase ID token in the Authorization header:

```http
Authorization: Bearer <firebase_id_token>
```

### API Key Authentication

For programmatic access, use an API key:

```http
X-API-Key: <your_api_key>
```

## Rate Limiting

| Tier | Requests/min | AI Requests/min |
|------|--------------|-----------------|
| Free | 50 | 10 |
| Pro | 200 | 50 |
| Business | 500 | 200 |
| Enterprise | 2000 | 1000 |

Rate limit headers are included in all responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {},
    "requestId": "req_abc123",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| AUTH_001 | 401 | Authentication required |
| AUTH_002 | 401 | Invalid token |
| AUTH_003 | 401 | Token expired |
| AUTHZ_001 | 403 | Access forbidden |
| VAL_001 | 400 | Validation error |
| RES_001 | 404 | Resource not found |
| RATE_001 | 429 | Rate limit exceeded |
| SRV_001 | 500 | Internal server error |

---

## User Routes

### Get Current User

```typescript
// Query
user.me()

// Response
{
  id: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: 'USER' | 'STUDIO_ADMIN' | 'MASTER_ADMIN';
  organizationId: string;
  subscriptionTier: 'FREE' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';
  creditsRemaining: number;
  createdAt: Date;
}
```

### Update Profile

```typescript
// Mutation
user.updateProfile({
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  timezone?: string;
  language?: string;
})

// Response
{ success: true, user: User }
```

### Get User Statistics

```typescript
// Query
user.stats()

// Response
{
  projectCount: number;
  publishedCount: number;
  totalInteractions: number;
  creditsUsed: number;
}
```

---

## Organization Routes

### Get Organization

```typescript
// Query
organization.get()

// Response
{
  id: string;
  name: string;
  slug: string;
  tier: SubscriptionTier;
  limits: {
    projects: number;
    users: number;
    storage: number;
    apiCalls: number;
  };
  usage: {
    projects: number;
    users: number;
    storage: number;
    apiCallsThisMonth: number;
  };
}
```

### Update Organization

```typescript
// Mutation
organization.update({
  name?: string;
  logo?: string;
  description?: string;
  industry?: string;
})

// Response
{ success: true, organization: Organization }
```

### List Members

```typescript
// Query
organization.listMembers({
  page?: number;
  limit?: number;
})

// Response
{
  members: User[];
  total: number;
  page: number;
  totalPages: number;
}
```

### Invite Member

```typescript
// Mutation
organization.invite({
  email: string;
  role: Role;
  message?: string;
})

// Response
{ success: true, invitation: Invitation }
```

---

## Project Routes

### List Projects

```typescript
// Query
project.list({
  page?: number;
  limit?: number;
  status?: ProjectStatus;
  search?: string;
})

// Response
{
  projects: Project[];
  total: number;
  page: number;
  totalPages: number;
}
```

### Create Project

```typescript
// Mutation
project.create({
  name: string;
  description?: string;
  subdomain: string;
})

// Response
{ success: true, project: Project }
```

### Get Project

```typescript
// Query
project.get({ id: string })

// Response
Project
```

### Update Project

```typescript
// Mutation
project.update({
  id: string;
  name?: string;
  description?: string;
  architecture?: object;
  design?: object;
  codeFiles?: object;
})

// Response
{ success: true, project: Project }
```

### Delete Project

```typescript
// Mutation
project.delete({ id: string })

// Response
{ success: true }
```

### Publish Project

```typescript
// Mutation
project.publish({
  id: string;
  domain?: string;
  sslEnabled?: boolean;
})

// Response
{
  success: true;
  deploymentUrl: string;
}
```

---

## AI Agent Routes

### Agent Don - Architecture

```typescript
// Mutation
agents.don.generateArchitecture({
  projectId: string;
  prompt: string;
  context?: {
    industry?: string;
    style?: string;
    features?: string[];
  };
})

// Response
{
  success: true;
  architecture: {
    pages: Page[];
    components: Component[];
    dataModels: DataModel[];
    integrations: Integration[];
  };
  metrics: {
    latencyMs: number;
    tokensUsed: number;
    cost: number;
  };
}
```

### Agent Mark - Code Generation

```typescript
// Mutation
agents.mark.generateCode({
  projectId: string;
  prompt: string;
  architecture: object;
  design: object;
  context?: {
    framework?: string;
    language?: string;
  };
})

// Response
{
  success: true;
  code: {
    files: CodeFile[];
    dependencies: Dependency[];
  };
  metrics: {
    latencyMs: number;
    tokensUsed: number;
    cost: number;
  };
}
```

### Agent Jessica - Design

```typescript
// Mutation
agents.jessica.generateDesign({
  projectId: string;
  prompt: string;
  context?: {
    brand?: string;
    colors?: string[];
    style?: string;
  };
})

// Response
{
  success: true;
  design: {
    colors: ColorPalette;
    typography: Typography;
    components: ComponentStyles;
    spacing: SpacingScale;
  };
  metrics: {
    latencyMs: number;
    tokensUsed: number;
    cost: number;
  };
}
```

### Agent Sherlock - Website Cloning

```typescript
// Mutation
agents.sherlock.analyzeWebsite({
  url: string;
  depth?: number;
})

// Response
{
  success: true;
  analysis: {
    structure: PageStructure;
    colors: ExtractedColors;
    typography: ExtractedTypography;
    components: IdentifiedComponents[];
    technologies: DetectedTechnologies[];
  };
}
```

### Agent Zara - Voice Assistant

```typescript
// Subscription
agents.zara.stream({
  projectId: string;
  audioData: string; // Base64 encoded audio
})

// Response (streaming)
{
  type: 'transcript' | 'response' | 'action';
  data: object;
}
```

---

## Template Routes

### List Templates

```typescript
// Query
template.list({
  category?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
})

// Response
{
  templates: Template[];
  total: number;
  categories: string[];
}
```

### Get Template

```typescript
// Query
template.get({ id: string })

// Response
Template
```

### Use Template

```typescript
// Mutation
template.use({
  templateId: string;
  projectName: string;
})

// Response
{
  success: true;
  project: Project;
}
```

---

## Theme Routes

### List Themes

```typescript
// Query
theme.list()

// Response
Theme[]
```

### Create Theme

```typescript
// Mutation
theme.create({
  name: string;
  method: 'create' | 'clone' | 'image' | 'html';
  sourceUrl?: string;
  sourceImage?: string;
  colors?: ColorPalette;
})

// Response
{ success: true, theme: Theme }
```

### Generate from Website

```typescript
// Mutation
theme.generateFromUrl({
  url: string;
})

// Response
{
  success: true;
  theme: Theme;
}
```

### Generate from Image

```typescript
// Mutation
theme.generateFromImage({
  imageUrl: string;
})

// Response
{
  success: true;
  theme: Theme;
}
```

---

## Admin Routes (Master Admin Only)

### Dashboard Stats

```typescript
// Query
admin.dashboardStats()

// Response
{
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  totalRevenue: number;
  userGrowth: GrowthData[];
  revenueGrowth: GrowthData[];
}
```

### List Users

```typescript
// Query
admin.listUsers({
  page?: number;
  limit?: number;
  search?: string;
  status?: AccountStatus;
  role?: Role;
})

// Response
{
  users: User[];
  total: number;
}
```

### Update User

```typescript
// Mutation
admin.updateUser({
  userId: string;
  role?: Role;
  status?: AccountStatus;
  creditsRemaining?: number;
})

// Response
{ success: true, user: User }
```

### System Health

```typescript
// Query
admin.systemHealth()

// Response
{
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    api: ServiceStatus;
    database: ServiceStatus;
    redis: ServiceStatus;
    ai: ServiceStatus;
  };
  metrics: SystemMetrics;
}
```

### Feature Flags

```typescript
// Query
admin.listFeatureFlags()

// Response
FeatureFlag[]

// Mutation
admin.updateFeatureFlag({
  key: string;
  status: 'ENABLED' | 'DISABLED' | 'PERCENTAGE';
  percentage?: number;
})

// Response
{ success: true, flag: FeatureFlag }
```

---

## Webhooks

### Available Events

| Event | Description |
|-------|-------------|
| `project.created` | New project created |
| `project.published` | Project published |
| `project.deleted` | Project deleted |
| `user.created` | New user registered |
| `subscription.changed` | Subscription tier changed |
| `payment.success` | Payment successful |
| `payment.failed` | Payment failed |

### Webhook Payload

```json
{
  "event": "project.published",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "projectId": "proj_abc123",
    "deploymentUrl": "https://my-site.plugspace.io"
  },
  "signature": "sha256=..."
}
```

### Signature Verification

```typescript
const crypto = require('crypto');

function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

---

## TypeScript Types

```typescript
// Import types from the API client
import type { User, Project, Template, Theme } from '@plugspace/api/types';

// Use with tRPC client
import { trpc } from '@/lib/trpc';

const user = await trpc.user.me.query();
// user is fully typed as User
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@plugspace/api';

const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'https://api.plugspace.io/trpc',
      headers: () => ({
        Authorization: `Bearer ${getToken()}`,
      }),
    }),
  ],
});

// Create a project
const project = await client.project.create.mutate({
  name: 'My Website',
  description: 'A cool website',
  subdomain: 'my-website',
});

// Generate architecture
const architecture = await client.agents.don.generateArchitecture.mutate({
  projectId: project.id,
  prompt: 'Create a modern portfolio website with blog',
});
```

### React Query Integration

```typescript
import { trpc } from '@/lib/trpc';

function Projects() {
  const { data, isLoading } = trpc.project.list.useQuery({
    page: 1,
    limit: 10,
  });

  const createProject = trpc.project.create.useMutation({
    onSuccess: () => {
      // Invalidate and refetch
      utils.project.list.invalidate();
    },
  });

  return (
    <div>
      {data?.projects.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
```

---

## Changelog

### v1.4.0 (Current)

- Added AI agent streaming support
- Introduced multi-tenant architecture
- Added comprehensive error handling
- New admin dashboard endpoints
- Enhanced rate limiting per tier

### v1.3.0

- Initial public release
- Core API endpoints
- Basic AI integration
