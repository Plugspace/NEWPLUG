// ==============================================
// PLUGSPACE.IO TITAN v1.4 - AGENT DON (ARCHITECT)
// ==============================================
// Claude Sonnet 4.5 powered architecture generation
// with advanced prompt engineering, multi-stage
// reasoning, and comprehensive output validation
// ==============================================

import { z } from 'zod';
import { Redis } from 'ioredis';
import { LLMService, LLMConfig, LLMMessage, LLMResponse } from '../services/llm/provider';
import { logger } from '../lib/logger';
import { AppError, ErrorCodes, AIError, ValidationError } from '@plugspace/utils';

// ============ OUTPUT SCHEMAS ============

export const ArchitectureMetadataSchema = z.object({
  appName: z.string(),
  industry: z.string(),
  targetAudience: z.string(),
  complexity: z.enum(['simple', 'moderate', 'complex', 'enterprise']),
  estimatedDevTime: z.number(),
  estimatedCost: z.number(),
  keywords: z.array(z.string()).optional(),
});

export const PageSectionSchema = z.object({
  name: z.string(),
  type: z.enum(['hero', 'features', 'testimonials', 'cta', 'form', 'gallery', 'pricing', 'faq', 'team', 'contact', 'about', 'stats', 'partners', 'blog', 'custom']),
  components: z.array(z.string()),
  dataRequirements: z.array(z.string()),
  order: z.number().optional(),
});

export const PageSchema = z.object({
  name: z.string(),
  route: z.string(),
  purpose: z.string(),
  sections: z.array(PageSectionSchema),
  accessControl: z.object({
    public: z.boolean(),
    roles: z.array(z.string()),
    permissions: z.array(z.string()),
  }),
  seo: z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.array(z.string()),
  }),
  performance: z.object({
    priority: z.enum(['high', 'medium', 'low']),
    lazyLoad: z.boolean(),
    prefetch: z.boolean(),
  }),
});

export const DatabaseFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean(),
  unique: z.boolean().optional(),
  default: z.any().optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    enum: z.array(z.string()).optional(),
  }).optional(),
  index: z.boolean().optional(),
  sensitive: z.boolean().optional(),
});

export const DatabaseModelSchema = z.object({
  name: z.string(),
  description: z.string(),
  fields: z.array(DatabaseFieldSchema),
  relationships: z.array(z.object({
    type: z.enum(['hasOne', 'hasMany', 'belongsTo', 'manyToMany']),
    model: z.string(),
    foreignKey: z.string().optional(),
    onDelete: z.enum(['cascade', 'setNull', 'restrict']),
  })),
  indexes: z.array(z.object({
    fields: z.array(z.string()),
    unique: z.boolean(),
    sparse: z.boolean().optional(),
  })).optional(),
});

export const FeatureSchema = z.object({
  name: z.string(),
  category: z.string(),
  priority: z.enum(['must-have', 'should-have', 'nice-to-have']),
  dependencies: z.array(z.string()),
  estimatedTime: z.number(),
  thirdPartyServices: z.array(z.string()).optional(),
});

export const AuthenticationSchema = z.object({
  required: z.boolean(),
  methods: z.array(z.enum(['email', 'google', 'github', 'phone', 'sso'])),
  roles: z.array(z.object({
    name: z.string(),
    permissions: z.array(z.string()),
    hierarchyLevel: z.number(),
  })),
  mfa: z.boolean().optional(),
  sessionTimeout: z.number().optional(),
});

export const APIEndpointSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path: z.string(),
  description: z.string(),
  authentication: z.boolean(),
  rateLimit: z.number().optional(),
  requestBody: z.record(z.any()).optional(),
  responseBody: z.record(z.any()).optional(),
  errorCodes: z.array(z.string()).optional(),
});

export const IntegrationSchema = z.object({
  service: z.string(),
  purpose: z.string(),
  configuration: z.record(z.any()),
  webhooks: z.array(z.string()).optional(),
});

export const ArchitectureOutputSchema = z.object({
  metadata: ArchitectureMetadataSchema,
  pages: z.array(PageSchema),
  database: z.object({
    models: z.array(DatabaseModelSchema),
    seedData: z.boolean().optional(),
  }),
  features: z.array(FeatureSchema),
  authentication: AuthenticationSchema,
  api: z.object({
    endpoints: z.array(APIEndpointSchema),
    versioning: z.boolean(),
    documentation: z.boolean(),
  }),
  integrations: z.array(IntegrationSchema),
  infrastructure: z.object({
    hosting: z.enum(['vps', 'serverless', 'kubernetes']),
    cdn: z.boolean(),
    caching: z.object({
      strategy: z.enum(['redis', 'memcached', 'cdn']),
      ttl: z.number(),
    }),
    monitoring: z.array(z.string()),
    backup: z.object({
      frequency: z.string(),
      retention: z.number(),
    }),
  }),
  security: z.object({
    ssl: z.boolean(),
    cors: z.array(z.string()),
    rateLimit: z.object({
      windowMs: z.number(),
      maxRequests: z.number(),
    }),
    contentSecurityPolicy: z.record(z.any()),
    dataEncryption: z.array(z.string()),
  }),
  compliance: z.array(z.string()),
  scalability: z.object({
    expectedUsers: z.number(),
    concurrentUsers: z.number(),
    requestsPerSecond: z.number(),
    dataGrowthRate: z.string(),
  }),
});

export type ArchitectureOutput = z.infer<typeof ArchitectureOutputSchema>;

// ============ AGENT DON CLASS ============

export class AgentDon {
  private llm: LLMService;
  private redis: Redis;
  private config: LLMConfig;

  constructor(llm: LLMService, redis: Redis) {
    this.llm = llm;
    this.redis = redis;
    this.config = {
      provider: 'claude',
      model: 'claude-sonnet-4-20250514',
      temperature: 0.2,
      maxTokens: 8192,
      systemPrompt: this.getSystemPrompt(),
    };
  }

  // ============ MAIN GENERATION METHOD ============

  async generateArchitecture(
    prompt: string,
    context: {
      industry?: string;
      style?: string;
      features?: string[];
      targetAudience?: string;
      budget?: 'low' | 'medium' | 'high';
      timeline?: 'urgent' | 'normal' | 'flexible';
      previousArchitecture?: ArchitectureOutput;
      userFeedback?: string;
    },
    options: {
      projectId: string;
      userId: string;
      organizationId: string;
      stream?: boolean;
    }
  ): Promise<{
    architecture: ArchitectureOutput;
    response: LLMResponse;
    suggestions: DesignSuggestion[];
  }> {
    const startTime = Date.now();

    logger.info('Agent Don starting architecture generation', {
      projectId: options.projectId,
      userId: options.userId,
      promptLength: prompt.length,
      industry: context.industry,
    });

    try {
      // Stage 1: Intent Analysis
      const intent = await this.analyzeIntent(prompt, context);

      // Stage 2: Generate Architecture
      const messages = this.buildMessages(prompt, context, intent);
      
      const response = await this.llm.complete(this.config, messages, {
        projectId: options.projectId,
        userId: options.userId,
        organizationId: options.organizationId,
        cache: true,
        cacheTTL: 3600,
        retries: 3,
      });

      // Stage 3: Parse and Validate
      const architecture = this.parseArchitecture(response.content);

      // Stage 4: Generate Suggestions
      const suggestions = await this.generateSuggestions(architecture, context);

      // Stage 5: Quality Validation
      await this.validateQuality(architecture);

      logger.info('Agent Don completed architecture generation', {
        projectId: options.projectId,
        duration: Date.now() - startTime,
        pageCount: architecture.pages.length,
        modelCount: architecture.database.models.length,
        featureCount: architecture.features.length,
      });

      return { architecture, response, suggestions };

    } catch (error) {
      logger.error('Agent Don architecture generation failed', {
        projectId: options.projectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw this.handleError(error);
    }
  }

  // ============ STREAMING GENERATION ============

  async *streamArchitecture(
    prompt: string,
    context: {
      industry?: string;
      style?: string;
      features?: string[];
      targetAudience?: string;
    },
    options: {
      projectId: string;
      userId: string;
      organizationId: string;
    }
  ): AsyncGenerator<{
    type: 'progress' | 'content' | 'complete' | 'error';
    data: any;
  }> {
    yield { type: 'progress', data: { stage: 'analyzing', progress: 10 } };

    const intent = await this.analyzeIntent(prompt, context);
    yield { type: 'progress', data: { stage: 'planning', progress: 25, intent } };

    const messages = this.buildMessages(prompt, context, intent);
    let fullContent = '';

    yield { type: 'progress', data: { stage: 'generating', progress: 40 } };

    for await (const chunk of this.llm.stream(this.config, messages, options)) {
      if (chunk.type === 'text' && chunk.content) {
        fullContent += chunk.content;
        yield { type: 'content', data: { chunk: chunk.content } };
      } else if (chunk.type === 'error') {
        yield { type: 'error', data: { message: chunk.error } };
        return;
      }
    }

    yield { type: 'progress', data: { stage: 'validating', progress: 85 } };

    try {
      const architecture = this.parseArchitecture(fullContent);
      const suggestions = await this.generateSuggestions(architecture, context);
      
      yield { type: 'progress', data: { stage: 'complete', progress: 100 } };
      yield { type: 'complete', data: { architecture, suggestions } };
    } catch (error) {
      yield { type: 'error', data: { message: 'Failed to parse architecture' } };
    }
  }

  // ============ REFINEMENT METHOD ============

  async refineArchitecture(
    currentArchitecture: ArchitectureOutput,
    feedback: string,
    options: {
      projectId: string;
      userId: string;
      organizationId: string;
    }
  ): Promise<{
    architecture: ArchitectureOutput;
    changes: string[];
    response: LLMResponse;
  }> {
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: this.getRefinementPrompt(),
      },
      {
        role: 'user',
        content: `Current architecture:\n${JSON.stringify(currentArchitecture, null, 2)}\n\nUser feedback:\n${feedback}\n\nPlease refine the architecture based on this feedback. Return the complete updated architecture JSON.`,
      },
    ];

    const response = await this.llm.complete(this.config, messages, {
      ...options,
      cache: false,
    });

    const architecture = this.parseArchitecture(response.content);
    const changes = this.detectChanges(currentArchitecture, architecture);

    return { architecture, changes, response };
  }

  // ============ INTENT ANALYSIS ============

  private async analyzeIntent(
    prompt: string,
    context: Record<string, unknown>
  ): Promise<{
    type: 'landing' | 'webapp' | 'ecommerce' | 'portfolio' | 'blog' | 'saas';
    complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
    features: string[];
    constraints: string[];
  }> {
    const analysisPrompt = `Analyze this user request and extract key information:

User Request: "${prompt}"
Context: ${JSON.stringify(context)}

Respond with JSON only:
{
  "type": "landing|webapp|ecommerce|portfolio|blog|saas",
  "complexity": "simple|moderate|complex|enterprise",
  "features": ["feature1", "feature2"],
  "constraints": ["constraint1", "constraint2"]
}`;

    const response = await this.llm.complete(
      { ...this.config, maxTokens: 1024, temperature: 0.1 },
      [{ role: 'user', content: analysisPrompt }],
      { cache: true }
    );

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Default fallback
    }

    return {
      type: 'webapp',
      complexity: 'moderate',
      features: [],
      constraints: [],
    };
  }

  // ============ MESSAGE BUILDING ============

  private buildMessages(
    prompt: string,
    context: Record<string, unknown>,
    intent: Record<string, unknown>
  ): LLMMessage[] {
    const industryExamples = this.getIndustryExamples(context.industry as string);
    
    return [
      {
        role: 'system',
        content: this.config.systemPrompt || '',
      },
      {
        role: 'user',
        content: `${industryExamples}

User Request: "${prompt}"

Context:
- Industry: ${context.industry || 'General'}
- Style: ${context.style || 'Modern'}
- Target Audience: ${context.targetAudience || 'General'}
- Budget: ${context.budget || 'Medium'}
- Timeline: ${context.timeline || 'Normal'}
- Required Features: ${(context.features as string[] || []).join(', ') || 'None specified'}

Intent Analysis:
${JSON.stringify(intent, null, 2)}

Generate a comprehensive, production-ready architecture following the exact JSON schema provided. Include all necessary pages, database models, API endpoints, and security configurations.

IMPORTANT: Return ONLY valid JSON matching the ArchitectureOutput schema. Do not include any text before or after the JSON.`,
      },
    ];
  }

  // ============ SYSTEM PROMPT ============

  private getSystemPrompt(): string {
    return `You are Agent Don, an expert software architect specializing in creating production-ready application architectures. You work with a team of AI agents (Jessica for design, Mark for code) to build complete applications.

Your responsibilities:
1. Translate vague user intents into precise, actionable architectures
2. Design scalable, secure, and maintainable systems
3. Consider performance, accessibility, and SEO from the start
4. Anticipate edge cases and potential issues
5. Follow industry best practices and modern conventions

Architecture principles:
- Mobile-first responsive design
- Progressive enhancement
- Separation of concerns
- DRY (Don't Repeat Yourself)
- Security by default
- Performance optimization
- Accessibility compliance (WCAG 2.1 AA)

Output format:
You MUST return a valid JSON object matching this TypeScript interface:

interface ArchitectureOutput {
  metadata: {
    appName: string;
    industry: string;
    targetAudience: string;
    complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
    estimatedDevTime: number;
    estimatedCost: number;
  };
  pages: Array<{
    name: string;
    route: string;
    purpose: string;
    sections: Array<{
      name: string;
      type: 'hero' | 'features' | 'testimonials' | 'cta' | 'form' | 'gallery' | 'pricing' | 'faq' | 'team' | 'contact' | 'about' | 'stats' | 'partners' | 'blog' | 'custom';
      components: string[];
      dataRequirements: string[];
    }>;
    accessControl: { public: boolean; roles: string[]; permissions: string[] };
    seo: { title: string; description: string; keywords: string[] };
    performance: { priority: 'high' | 'medium' | 'low'; lazyLoad: boolean; prefetch: boolean };
  }>;
  database: {
    models: Array<{
      name: string;
      description: string;
      fields: Array<{
        name: string;
        type: string;
        required: boolean;
        unique?: boolean;
        index?: boolean;
        sensitive?: boolean;
      }>;
      relationships: Array<{
        type: 'hasOne' | 'hasMany' | 'belongsTo' | 'manyToMany';
        model: string;
        onDelete: 'cascade' | 'setNull' | 'restrict';
      }>;
    }>;
    seedData?: boolean;
  };
  features: Array<{
    name: string;
    category: string;
    priority: 'must-have' | 'should-have' | 'nice-to-have';
    dependencies: string[];
    estimatedTime: number;
  }>;
  authentication: {
    required: boolean;
    methods: Array<'email' | 'google' | 'github' | 'phone' | 'sso'>;
    roles: Array<{ name: string; permissions: string[]; hierarchyLevel: number }>;
    mfa?: boolean;
  };
  api: {
    endpoints: Array<{
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      path: string;
      description: string;
      authentication: boolean;
    }>;
    versioning: boolean;
    documentation: boolean;
  };
  integrations: Array<{
    service: string;
    purpose: string;
    configuration: object;
  }>;
  infrastructure: {
    hosting: 'vps' | 'serverless' | 'kubernetes';
    cdn: boolean;
    caching: { strategy: 'redis' | 'memcached' | 'cdn'; ttl: number };
    monitoring: string[];
    backup: { frequency: string; retention: number };
  };
  security: {
    ssl: boolean;
    cors: string[];
    rateLimit: { windowMs: number; maxRequests: number };
    contentSecurityPolicy: object;
    dataEncryption: string[];
  };
  compliance: string[];
  scalability: {
    expectedUsers: number;
    concurrentUsers: number;
    requestsPerSecond: number;
    dataGrowthRate: string;
  };
}

Always provide complete, valid JSON. Never include explanatory text outside the JSON structure.`;
  }

  private getRefinementPrompt(): string {
    return `You are Agent Don refining an existing architecture based on user feedback. Analyze the feedback carefully and make targeted changes while preserving the overall structure.

Guidelines:
1. Only modify what the feedback specifically requests
2. Maintain consistency with unchanged parts
3. Update related elements when necessary
4. Keep the architecture valid and complete
5. Improve based on feedback without over-engineering

Return ONLY the complete updated architecture JSON.`;
  }

  // ============ INDUSTRY EXAMPLES ============

  private getIndustryExamples(industry?: string): string {
    const examples: Record<string, string> = {
      ecommerce: `Example E-commerce patterns:
- Product catalog with categories and filters
- Shopping cart with persistence
- Checkout flow with multiple steps
- Order management and tracking
- User reviews and ratings
- Wishlist functionality`,

      saas: `Example SaaS patterns:
- Multi-tenant architecture
- Subscription management
- Role-based access control
- Dashboard with analytics
- Settings and preferences
- API access for integrations`,

      healthcare: `Example Healthcare patterns:
- Patient portal
- Appointment scheduling
- Medical records (HIPAA compliant)
- Secure messaging
- Telehealth integration
- Prescription management`,

      fintech: `Example Fintech patterns:
- Account management
- Transaction history
- Payment processing (PCI compliant)
- Budget tracking
- Investment portfolio
- Secure authentication (MFA required)`,

      education: `Example Education patterns:
- Course management
- Student progress tracking
- Assignment submission
- Discussion forums
- Video content delivery
- Certificate generation`,
    };

    return examples[industry?.toLowerCase() || ''] || '';
  }

  // ============ PARSING & VALIDATION ============

  private parseArchitecture(content: string): ArchitectureOutput {
    // Extract JSON from response
    let jsonStr = content;
    
    // Try to find JSON in markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      // Try to find raw JSON
      const rawMatch = content.match(/\{[\s\S]*\}/);
      if (rawMatch) {
        jsonStr = rawMatch[0];
      }
    }

    try {
      const parsed = JSON.parse(jsonStr);
      const validated = ArchitectureOutputSchema.parse(parsed);
      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('Architecture validation failed', {
          errors: error.errors,
        });
        throw new ValidationError(
          error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          }))
        );
      }
      throw new AIError(
        ErrorCodes.GENERATION_FAILED,
        'Failed to parse architecture output',
        'Don',
        this.config.model
      );
    }
  }

  private async validateQuality(
    architecture: ArchitectureOutput
  ): Promise<void> {
    const issues: string[] = [];

    // Check for missing required pages
    if (!architecture.pages.some(p => p.route === '/')) {
      issues.push('Missing home page (route: /)');
    }

    // Check database model relationships
    const modelNames = architecture.database.models.map(m => m.name);
    for (const model of architecture.database.models) {
      for (const rel of model.relationships) {
        if (!modelNames.includes(rel.model)) {
          issues.push(`Model ${model.name} references non-existent model ${rel.model}`);
        }
      }
    }

    // Check feature dependencies
    const featureNames = architecture.features.map(f => f.name);
    for (const feature of architecture.features) {
      for (const dep of feature.dependencies) {
        if (!featureNames.includes(dep)) {
          issues.push(`Feature ${feature.name} depends on non-existent feature ${dep}`);
        }
      }
    }

    // Check security configuration
    if (!architecture.security.ssl) {
      issues.push('SSL should be enabled for production');
    }

    if (issues.length > 0) {
      logger.warn('Architecture quality issues detected', { issues });
    }
  }

  // ============ CHANGE DETECTION ============

  private detectChanges(
    original: ArchitectureOutput,
    updated: ArchitectureOutput
  ): string[] {
    const changes: string[] = [];

    // Compare pages
    const originalPages = new Set(original.pages.map(p => p.route));
    const updatedPages = new Set(updated.pages.map(p => p.route));
    
    for (const route of updatedPages) {
      if (!originalPages.has(route)) {
        changes.push(`Added page: ${route}`);
      }
    }
    for (const route of originalPages) {
      if (!updatedPages.has(route)) {
        changes.push(`Removed page: ${route}`);
      }
    }

    // Compare models
    const originalModels = new Set(original.database.models.map(m => m.name));
    const updatedModels = new Set(updated.database.models.map(m => m.name));
    
    for (const name of updatedModels) {
      if (!originalModels.has(name)) {
        changes.push(`Added database model: ${name}`);
      }
    }

    // Compare features
    const originalFeatures = new Set(original.features.map(f => f.name));
    const updatedFeatures = new Set(updated.features.map(f => f.name));
    
    for (const name of updatedFeatures) {
      if (!originalFeatures.has(name)) {
        changes.push(`Added feature: ${name}`);
      }
    }

    return changes;
  }

  // ============ SUGGESTIONS ============

  private async generateSuggestions(
    architecture: ArchitectureOutput,
    context: Record<string, unknown>
  ): Promise<DesignSuggestion[]> {
    const suggestions: DesignSuggestion[] = [];

    // Performance suggestions
    if (architecture.pages.length > 10) {
      suggestions.push({
        category: 'performance',
        title: 'Consider Code Splitting',
        description: 'With many pages, implement route-based code splitting to improve initial load time.',
        priority: 'high',
        effort: 'medium',
        impact: 'high',
      });
    }

    // Security suggestions
    if (!architecture.authentication.mfa && architecture.metadata.complexity === 'enterprise') {
      suggestions.push({
        category: 'security',
        title: 'Enable Multi-Factor Authentication',
        description: 'Enterprise applications should require MFA for enhanced security.',
        priority: 'high',
        effort: 'medium',
        impact: 'high',
      });
    }

    // SEO suggestions
    const pagesWithoutSEO = architecture.pages.filter(
      p => !p.seo.description || p.seo.description.length < 50
    );
    if (pagesWithoutSEO.length > 0) {
      suggestions.push({
        category: 'seo',
        title: 'Improve Meta Descriptions',
        description: `${pagesWithoutSEO.length} pages have short or missing meta descriptions. Aim for 150-160 characters.`,
        priority: 'medium',
        effort: 'low',
        impact: 'medium',
      });
    }

    // Accessibility suggestions
    suggestions.push({
      category: 'accessibility',
      title: 'Implement Skip Links',
      description: 'Add skip navigation links for keyboard users to jump to main content.',
      priority: 'medium',
      effort: 'low',
      impact: 'high',
    });

    // Industry-specific suggestions
    if (context.industry === 'ecommerce') {
      if (!architecture.features.some(f => f.name.toLowerCase().includes('cart'))) {
        suggestions.push({
          category: 'feature',
          title: 'Add Shopping Cart',
          description: 'E-commerce sites typically need a persistent shopping cart.',
          priority: 'high',
          effort: 'high',
          impact: 'high',
        });
      }
    }

    return suggestions;
  }

  // ============ ERROR HANDLING ============

  private handleError(error: unknown): AppError {
    if (error instanceof AppError) return error;

    if (error instanceof z.ZodError) {
      return new ValidationError(
        error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    return new AIError(
      ErrorCodes.AI_ERROR,
      error instanceof Error ? error.message : 'Architecture generation failed',
      'Don',
      this.config.model
    );
  }
}

// ============ SUGGESTION INTERFACE ============

export interface DesignSuggestion {
  category: 'performance' | 'security' | 'seo' | 'accessibility' | 'ux' | 'feature';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  autoApply?: boolean;
  code?: string;
}

export default AgentDon;
