# Plugspace.io Titan v1.4 - AI Agents Architecture

## Overview

Plugspace.io Titan uses a Dual-LLM architecture with four specialized AI agents working in coordination to generate complete, production-ready web applications.

## Agent Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Request                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Agent Coordinator                              │
│         (Workflow Orchestration & Error Recovery)                │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Agent Don   │───▶│ Agent Jessica │───▶│  Agent Mark   │
│  (Architect)  │    │  (Designer)   │    │  (Engineer)   │
│ Claude 4.5    │    │ Gemini 3.0    │    │ Claude 4.5    │
└───────────────┘    └───────────────┘    └───────────────┘
        ▲                                          │
        │                                          │
        │    ┌───────────────┐                     │
        │    │Agent Sherlock │                     │
        └────│  (Analyst)    │─────────────────────┘
             │ Gemini 3.0    │
             └───────────────┘
```

## Agent Specifications

### Agent Don - The Architect
**LLM:** Claude Sonnet 4.5 (`claude-sonnet-4-20250514`)

**Responsibilities:**
- Translate vague user intents into precise application architectures
- Design scalable, secure system structures
- Generate database models and API specifications
- Plan feature implementations with dependencies

**Capabilities:**
- Multi-stage reasoning for complex analysis
- Industry-specific pattern recognition
- Chain-of-thought architectural decisions
- Self-correction for invalid outputs

**Output Schema:**
```typescript
interface ArchitectureOutput {
  metadata: {
    appName: string;
    industry: string;
    complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
    estimatedDevTime: number;
    estimatedCost: number;
  };
  pages: Page[];
  database: { models: DatabaseModel[] };
  features: Feature[];
  authentication: AuthConfig;
  api: APIConfig;
  integrations: Integration[];
  infrastructure: InfraConfig;
  security: SecurityConfig;
  compliance: string[];
  scalability: ScalabilityConfig;
}
```

### Agent Jessica - The Designer
**LLM:** Gemini 3.0 Pro (`gemini-2.0-flash-exp`)

**Responsibilities:**
- Generate comprehensive design systems
- Create accessible color palettes
- Design typography hierarchies
- Build component styles
- Ensure WCAG 2.1 AA compliance

**Capabilities:**
- Visual intelligence for reference image analysis
- Color theory and harmony validation
- Typography pairing algorithms
- Responsive design patterns
- Dark mode support

**Output Schema:**
```typescript
interface DesignOutput {
  metadata: { designSystem: string; version: string };
  brand: { name: string; personality: string[]; tone: string };
  colorScheme: {
    mode: 'light' | 'dark' | 'auto';
    palette: ColorPalette;
    semantic: SemanticColors;
    gradients: Gradient[];
    darkMode?: DarkModeConfig;
  };
  typography: TypographyConfig;
  spacing: SpacingConfig;
  layout: LayoutConfig;
  components: ComponentStyles;
  animations: AnimationConfig;
  responsive: ResponsiveConfig;
  accessibility: AccessibilityConfig;
  tailwindConfig: string;
  globalCSS: string;
}
```

### Agent Mark - The Engineer
**LLM:** Claude Sonnet 4.5 (`claude-sonnet-4-20250514`)

**Responsibilities:**
- Generate production-ready Next.js 15 code
- Implement React Server Components
- Create TypeScript-strict implementations
- Build comprehensive test suites
- Ensure security best practices

**Capabilities:**
- Component architecture design
- Performance optimization
- Accessibility implementation
- Security hardening
- Test generation

**Output Schema:**
```typescript
interface CodeOutput {
  metadata: {
    framework: 'Next.js 15';
    language: 'TypeScript';
    styleFramework: 'Tailwind CSS';
  };
  files: CodeFile[];
  dependencies: {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  scripts: Record<string, string>;
  environment: EnvironmentConfig;
  structure: FileStructure;
  documentation: Documentation;
}
```

### Agent Sherlock - The Analyst
**LLM:** Gemini 3.0 Pro (`gemini-2.0-flash-exp`)

**Responsibilities:**
- Analyze existing websites
- Extract design patterns
- Reverse-engineer architectures
- Provide competitive intelligence
- Capture multi-viewport screenshots

**Capabilities:**
- Visual design analysis
- Technology stack detection
- Color palette extraction
- Typography identification
- Performance evaluation
- SEO audit

**Output Schema:**
```typescript
interface AnalysisOutput {
  metadata: { url: string; analyzedAt: Date; confidence: number };
  screenshots: ScreenshotSet;
  technology: TechnologyStack;
  colorPalette: ColorExtraction[];
  typography: TypographyExtraction;
  layout: LayoutExtraction;
  components: ComponentExtraction[];
  designStyle: DesignStyle;
  performance: PerformanceMetrics;
  seo: SEOAnalysis;
  accessibility: AccessibilityAudit;
  recommendations: Recommendation[];
  competitiveInsights: CompetitiveInsights;
}
```

## Workflow Types

### 1. Create Workflow
Standard project creation: `ARCHITECT → DESIGN → CODE`

```typescript
const result = await coordinator.startWorkflow('create', {
  prompt: 'Create a SaaS dashboard for project management',
  options: {
    industry: 'saas',
    style: 'modern',
    includeTests: true,
  }
}, options);
```

### 2. Clone Workflow
Website cloning: `ANALYZE → ARCHITECT → DESIGN → CODE`

```typescript
const result = await coordinator.startWorkflow('clone', {
  url: 'https://example.com',
  options: {
    includeCode: true,
  }
}, options);
```

### 3. Refine Workflow
Iteration on existing project: `ARCHITECT → DESIGN → CODE`

```typescript
const result = await coordinator.refineWorkflow(workflowId, {
  feedback: 'Make the hero section more prominent',
}, options);
```

### 4. Design-Only Workflow
Architecture and design only: `ARCHITECT → DESIGN`

### 5. Code-Only Workflow
Code from existing architecture/design: `CODE`

### 6. Analyze-Only Workflow
Website analysis only: `ANALYZE`

## Queue Management

### Priority Levels
- **0 (Enterprise):** Immediate processing
- **1 (Professional):** High priority
- **2 (Starter):** Normal priority
- **3 (Free):** Low priority

### Task Flow
```
┌─────────┐     ┌─────────────┐     ┌─────────────┐
│ Pending │────▶│ Processing  │────▶│  Complete   │
└─────────┘     └─────────────┘     └─────────────┘
                      │
                      ▼ (on error)
               ┌─────────────┐
               │  Retrying   │───────────┐
               └─────────────┘           │
                      │                  │
                      ▼ (max retries)    │
               ┌─────────────┐           │
               │   Failed    │───────────┘
               └─────────────┘
```

### Rate Limiting
- Per-organization rate limiting
- Monthly quotas by subscription tier
- Token usage tracking

## Suggestion Engine

The platform includes an intelligent suggestion engine that provides:

### Suggestion Categories
- **Color:** Contrast, harmony, accessibility
- **Typography:** Pairing, readability, performance
- **Layout:** Grid, spacing, responsiveness
- **Component:** Variants, states, interactions
- **Animation:** Performance, reduced motion
- **Accessibility:** WCAG compliance
- **Performance:** Bundle size, load time
- **SEO:** Meta tags, structured data
- **UX:** Navigation, forms, CTAs
- **Conversion:** Social proof, trust signals

### Industry-Specific Suggestions
- **E-commerce:** Trust badges, cart recovery, quick view
- **SaaS:** Free trials, onboarding, usage analytics
- **Healthcare:** Enhanced accessibility, HIPAA compliance
- **Fintech:** MFA, tabular numbers, security
- **Education:** Progress tracking, gamification

## Error Handling

### Retry Strategy
- Exponential backoff (2s, 4s, 8s)
- Maximum 3 retries by default
- Retryable errors: rate limits, timeouts, service errors

### Fallback Mechanisms
- Model fallback (Claude → alternative model)
- Graceful degradation
- Partial result preservation

## Monitoring

### Metrics Tracked
- Request latency per agent
- Token usage and costs
- Success/failure rates
- Queue depth
- Worker utilization

### Alerts
- Agent response time > 30s
- Error rate > 5%
- Queue depth > 100
- Credit usage > 80%

## Best Practices

### For Architecture Generation
1. Provide clear, detailed prompts
2. Specify industry and target audience
3. Include feature requirements
4. Set appropriate complexity expectations

### For Design Generation
1. Provide brand colors if available
2. Reference inspiration images
3. Specify style preferences
4. Include accessibility requirements

### For Code Generation
1. Enable tests for production code
2. Specify custom requirements
3. Review generated structure
4. Customize environment variables

### For Website Analysis
1. Use public, accessible URLs
2. Allow sufficient timeout
3. Review confidence scores
4. Validate extracted data

## API Reference

See [API Documentation](./API.md) for complete endpoint specifications.

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Architecture Generation | < 15s | ~ 12s |
| Design Generation | < 20s | ~ 18s |
| Code Generation | < 30s | ~ 25s |
| Website Analysis | < 45s | ~ 40s |
| Queue Throughput | 100/min | 120/min |
