# Plugspace.io Titan v1.4 - Queue System Documentation

## Overview

The queue system is built on Redis with BullMQ, providing robust task management for AI agent orchestration with priority handling, retry mechanisms, and distributed processing.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Queue Manager                             │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  ARCHITECT  │  │   DESIGN    │  │    CODE     │              │
│  │   Queue     │  │   Queue     │  │   Queue     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  ANALYZE    │  │   DEPLOY    │  │   EXPORT    │              │
│  │   Queue     │  │   Queue     │  │   Queue     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                   │
│                    ┌─────────────┐                               │
│                    │ Flow        │                               │
│                    │ Producer    │                               │
│                    └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Redis Cluster                              │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Master    │──│  Replica 1  │──│  Replica 2  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                   │
│                    ┌─────────────┐                               │
│                    │  Sentinel   │                               │
│                    └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

## Task Schema

```typescript
interface AgentTask<T = unknown, R = unknown> {
  id: string;                          // Unique task identifier
  type: TaskType;                      // ARCHITECT | DESIGN | CODE | ANALYZE | DEPLOY | EXPORT
  projectId: string;                   // Associated project
  organizationId: string;              // Organization for scoping
  userId: string;                      // User who initiated
  priority: 0 | 1 | 2 | 3;            // 0=highest (enterprise), 3=lowest (free)
  
  input: T;                            // Task-specific input
  
  context: {
    previousTasks: string[];           // Task chain history
    userFeedback?: string[];           // User refinements
    iterationCount: number;            // Current iteration
    maxIterations: number;             // Maximum allowed iterations
    parentTaskId?: string;             // Parent in workflow
    chainedTasks?: string[];           // Dependent tasks
  };
  
  status: TaskStatus;                  // pending | processing | complete | failed | retrying
  result?: R;                          // Task output
  
  error?: {
    message: string;
    code: string;
    stack?: string;
    retryable: boolean;
  };
  
  metrics: {
    queuedAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    duration?: number;
    tokensUsed?: number;
    cost?: number;
  };
  
  retryCount: number;
  maxRetries: number;
  ttl: number;                         // Time to live in seconds
}
```

## Queue Types

### 1. ARCHITECT Queue
Handles architecture generation tasks.

**Configuration:**
- Concurrency: 5
- Default Priority: 2
- Rate Limit: 100/minute

**Input:**
```typescript
interface ArchitectInput {
  prompt: string;
  context?: {
    industry?: string;
    style?: string;
    features?: string[];
    targetAudience?: string;
    budget?: 'low' | 'medium' | 'high';
    timeline?: 'urgent' | 'normal' | 'flexible';
  };
  options?: {
    includeTests?: boolean;
  };
}
```

### 2. DESIGN Queue
Handles design system generation tasks.

**Configuration:**
- Concurrency: 5
- Default Priority: 2
- Rate Limit: 100/minute

**Input:**
```typescript
interface DesignInput {
  architecture?: ArchitectureOutput;
  context?: {
    industry?: string;
    style?: string;
    brandColors?: string[];
    referenceImage?: string;
    mood?: string;
  };
}
```

### 3. CODE Queue
Handles code generation tasks.

**Configuration:**
- Concurrency: 3
- Default Priority: 2
- Rate Limit: 50/minute

**Input:**
```typescript
interface CodeInput {
  architecture?: ArchitectureOutput;
  design?: DesignOutput;
  options?: {
    includeTests?: boolean;
    includeStorybook?: boolean;
  };
}
```

### 4. ANALYZE Queue
Handles website analysis tasks.

**Configuration:**
- Concurrency: 3
- Default Priority: 2
- Rate Limit: 30/minute

**Input:**
```typescript
interface AnalyzeInput {
  url: string;
  options?: {
    depth?: number;
    includeScreenshots?: boolean;
    analyzeTech?: boolean;
    analyzeDesign?: boolean;
    analyzePerformance?: boolean;
  };
}
```

### 5. DEPLOY Queue
Handles deployment tasks.

**Configuration:**
- Concurrency: 2
- Default Priority: 1
- Rate Limit: 10/minute

### 6. EXPORT Queue
Handles code export tasks.

**Configuration:**
- Concurrency: 5
- Default Priority: 3
- Rate Limit: 100/minute

## Priority System

| Level | Name | Description | Use Case |
|-------|------|-------------|----------|
| 0 | Enterprise | Immediate processing | Enterprise tier users |
| 1 | Professional | High priority | Professional tier users |
| 2 | Starter | Normal priority | Starter tier users |
| 3 | Free | Low priority | Free tier users |

## Workflow Management

### Creating a Workflow

```typescript
const { workflowId, taskIds } = await queueManager.addWorkflow(
  projectId,
  userId,
  organizationId,
  {
    prompt: 'Create a SaaS dashboard',
    context: { industry: 'saas' },
    options: { skipDesign: false, skipCode: false },
  },
  priority
);
```

### Workflow Steps

```
create: ARCHITECT → DESIGN → CODE
clone:  ANALYZE → ARCHITECT → DESIGN → CODE
refine: ARCHITECT → DESIGN → CODE
design-only: ARCHITECT → DESIGN
code-only: CODE
analyze-only: ANALYZE
```

## Rate Limiting

### Per-Organization Limits

```typescript
const quotas = {
  free: { ARCHITECT: 10, DESIGN: 10, CODE: 5, ANALYZE: 5, DEPLOY: 1, EXPORT: 5 },
  starter: { ARCHITECT: 100, DESIGN: 100, CODE: 50, ANALYZE: 50, DEPLOY: 10, EXPORT: 50 },
  professional: { ARCHITECT: 500, DESIGN: 500, CODE: 250, ANALYZE: 250, DEPLOY: 50, EXPORT: 250 },
  enterprise: { ARCHITECT: -1, DESIGN: -1, CODE: -1, ANALYZE: -1, DEPLOY: -1, EXPORT: -1 }, // Unlimited
};
```

### Request Rate Limiting
- Window: 60 seconds
- Max requests: 100 per window per organization

## Error Handling

### Retry Strategy

```typescript
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,  // 2s, 4s, 8s
  }
}
```

### Retryable Errors
- Rate limit exceeded (`RATE_LIMITED`)
- Request timeout (`TIMEOUT`)
- External service error (`EXTERNAL_SERVICE_ERROR`)

### Non-Retryable Errors
- Validation errors
- Authentication errors
- Quota exceeded

## Monitoring

### Queue Statistics

```typescript
const stats = await queueManager.getQueueStats();
// Returns:
{
  type: 'ARCHITECT',
  waiting: 5,
  active: 2,
  completed: 100,
  failed: 3,
  delayed: 1,
}
```

### Task Tracking

```typescript
const task = await queueManager.getTask(taskId);
// Returns full task with status and metrics
```

### Organization Tasks

```typescript
const tasks = await queueManager.getOrganizationTasks(organizationId, {
  status: 'processing',
  type: 'CODE',
  limit: 20,
  offset: 0,
});
```

## Events

### Queue Events

```typescript
queueManager.on('taskCompleted', ({ type, jobId, result }) => {
  console.log(`Task ${jobId} completed`);
});

queueManager.on('taskFailed', ({ type, jobId, error }) => {
  console.error(`Task ${jobId} failed: ${error}`);
});

queueManager.on('taskProgress', ({ type, jobId, progress }) => {
  console.log(`Task ${jobId}: ${progress}%`);
});
```

## Redis Key Structure

```
plugspace:architect          # ARCHITECT queue
plugspace:design             # DESIGN queue
plugspace:code               # CODE queue
plugspace:analyze            # ANALYZE queue
plugspace:deploy             # DEPLOY queue
plugspace:export             # EXPORT queue

plugspace:task:{taskId}      # Task data
plugspace:workflow:{id}      # Workflow data
plugspace:result:{taskId}:{type}  # Intermediate results

plugspace:ratelimit:{orgId}  # Rate limit counter
plugspace:usage:{orgId}:{type}:{month}  # Monthly usage
plugspace:org:{orgId}:tasks  # Organization task list
plugspace:org:{orgId}:tier   # Subscription tier

plugspace:export:{exportId}  # Export data (temporary)
```

## Configuration

### Queue Manager Options

```typescript
const queueManager = new QueueManager({
  redis: redisClient,
  concurrency: 5,          // Default worker concurrency
  maxRetries: 3,           // Default retry count
  defaultTTL: 3600,        // Default task TTL (1 hour)
  rateLimit: {
    max: 100,              // Max requests
    duration: 60000,       // Per 60 seconds
  },
});
```

### Worker Options

```typescript
queueManager.registerWorker('ARCHITECT', processor, {
  concurrency: 5,
  limiter: {
    max: 100,
    duration: 60000,
  },
});
```

## Best Practices

### 1. Task Idempotency
Design tasks to be idempotent - safe to retry without side effects.

### 2. Graceful Shutdown
```typescript
process.on('SIGTERM', async () => {
  await queueManager.close();
  process.exit(0);
});
```

### 3. Error Logging
Log all errors with context for debugging:
```typescript
logger.error('Task failed', {
  taskId,
  type,
  error: error.message,
  retryCount,
});
```

### 4. Progress Updates
Report progress for long-running tasks:
```typescript
await job.updateProgress({ stage: 'generating', progress: 50 });
```

### 5. Resource Cleanup
Always clean up resources in finally blocks:
```typescript
try {
  await processTask();
} finally {
  await redis.quit();
}
```

## Troubleshooting

### Common Issues

**1. Tasks stuck in pending**
- Check worker registration
- Verify Redis connection
- Check rate limits

**2. High failure rate**
- Review error logs
- Check external service status
- Verify input validation

**3. Slow processing**
- Increase concurrency
- Check Redis performance
- Review task complexity

### Debugging

```bash
# Check queue status
redis-cli> LLEN plugspace:architect:wait
redis-cli> LLEN plugspace:architect:active

# View task data
redis-cli> GET plugspace:task:{taskId}

# Check rate limits
redis-cli> GET plugspace:ratelimit:{orgId}
```

## API Reference

See [Agent Router](../apps/api/src/routers/agent.router.ts) for complete API specifications.
