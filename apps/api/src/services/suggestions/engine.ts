// ==============================================
// PLUGSPACE.IO TITAN v1.4 - SUGGESTION ENGINE
// ==============================================
// AI-powered suggestion algorithms to help guide
// users toward better design decisions with
// context-aware recommendations
// ==============================================

import { Redis } from 'ioredis';
import { LLMService, LLMConfig, LLMMessage } from '../llm/provider';
import { ArchitectureOutput } from '../../agents/don.architect';
import { DesignOutput } from '../../agents/jessica.designer';
import { logger } from '../../lib/logger';

// ============ SUGGESTION TYPES ============

export type SuggestionCategory = 
  | 'color'
  | 'typography'
  | 'layout'
  | 'component'
  | 'animation'
  | 'accessibility'
  | 'performance'
  | 'seo'
  | 'ux'
  | 'content'
  | 'security'
  | 'conversion';

export type SuggestionPriority = 'critical' | 'high' | 'medium' | 'low';
export type SuggestionEffort = 'trivial' | 'low' | 'medium' | 'high' | 'complex';

export interface Suggestion {
  id: string;
  category: SuggestionCategory;
  title: string;
  description: string;
  reason: string;
  priority: SuggestionPriority;
  effort: SuggestionEffort;
  impact: number; // 1-10
  
  // Optional fields
  currentValue?: string;
  suggestedValue?: string;
  preview?: string;
  code?: string;
  autoApply?: boolean;
  documentation?: string;
  
  // Metadata
  source: 'rule' | 'ai' | 'analytics' | 'industry';
  confidence: number; // 0-100
  tags: string[];
}

export interface SuggestionContext {
  industry?: string;
  targetAudience?: string;
  goals?: string[];
  competitors?: string[];
  userFeedback?: string[];
  analytics?: AnalyticsData;
  previousSuggestions?: string[];
}

export interface AnalyticsData {
  bounceRate?: number;
  avgSessionDuration?: number;
  conversionRate?: number;
  pageViews?: Record<string, number>;
  deviceBreakdown?: Record<string, number>;
  topExitPages?: string[];
}

// ============ SUGGESTION ENGINE ============

export class SuggestionEngine {
  private llm: LLMService;
  private redis: Redis;
  private config: LLMConfig;

  constructor(llm: LLMService, redis: Redis) {
    this.llm = llm;
    this.redis = redis;
    this.config = {
      provider: 'claude',
      model: 'claude-sonnet-4-20250514',
      temperature: 0.4,
      maxTokens: 4096,
    };
  }

  // ============ MAIN SUGGESTION METHODS ============

  async generateSuggestions(
    architecture: ArchitectureOutput,
    design: DesignOutput | null,
    context: SuggestionContext
  ): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Run all suggestion generators in parallel
    const [
      architectureSuggestions,
      designSuggestions,
      uxSuggestions,
      industrySuggestions,
      performanceSuggestions,
      accessibilitySuggestions,
      seoSuggestions,
      conversionSuggestions,
    ] = await Promise.all([
      this.analyzeArchitecture(architecture, context),
      design ? this.analyzeDesign(design, context) : Promise.resolve([]),
      this.analyzeUX(architecture, design, context),
      this.getIndustrySuggestions(context.industry, architecture),
      this.analyzePerformance(architecture, design),
      this.analyzeAccessibility(architecture, design),
      this.analyzeSEO(architecture),
      this.analyzeConversion(architecture, design, context),
    ]);

    suggestions.push(
      ...architectureSuggestions,
      ...designSuggestions,
      ...uxSuggestions,
      ...industrySuggestions,
      ...performanceSuggestions,
      ...accessibilitySuggestions,
      ...seoSuggestions,
      ...conversionSuggestions,
    );

    // Filter out previously dismissed suggestions
    const filtered = await this.filterDismissed(suggestions, context.previousSuggestions || []);

    // Deduplicate and prioritize
    const prioritized = this.prioritizeSuggestions(filtered);

    // Limit to top suggestions
    return prioritized.slice(0, 20);
  }

  // ============ ARCHITECTURE ANALYSIS ============

  private async analyzeArchitecture(
    architecture: ArchitectureOutput,
    context: SuggestionContext
  ): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Check page structure
    if (architecture.pages.length < 3) {
      suggestions.push({
        id: this.generateId(),
        category: 'ux',
        title: 'Add Essential Pages',
        description: 'Most applications need at least a home page, about page, and contact page.',
        reason: 'These pages help establish trust and provide necessary information.',
        priority: 'medium',
        effort: 'medium',
        impact: 7,
        source: 'rule',
        confidence: 90,
        tags: ['pages', 'navigation'],
      });
    }

    // Check for authentication without protected routes
    if (architecture.authentication.required) {
      const protectedPages = architecture.pages.filter(p => !p.accessControl.public);
      if (protectedPages.length === 0) {
        suggestions.push({
          id: this.generateId(),
          category: 'security',
          title: 'Add Protected Routes',
          description: 'Authentication is enabled but no pages are protected.',
          reason: 'Protected content adds value for authenticated users.',
          priority: 'high',
          effort: 'low',
          impact: 8,
          source: 'rule',
          confidence: 95,
          tags: ['authentication', 'security'],
        });
      }
    }

    // Check database model completeness
    for (const model of architecture.database.models) {
      if (!model.fields.some(f => f.name === 'createdAt')) {
        suggestions.push({
          id: this.generateId(),
          category: 'ux',
          title: `Add Timestamps to ${model.name}`,
          description: 'Add createdAt and updatedAt fields for audit trails.',
          reason: 'Timestamps help with debugging, sorting, and user experience.',
          priority: 'low',
          effort: 'trivial',
          impact: 5,
          code: `createdAt: DateTime @default(now())\nupdatedAt: DateTime @updatedAt`,
          autoApply: true,
          source: 'rule',
          confidence: 85,
          tags: ['database', 'audit'],
        });
      }
    }

    // Check API structure
    if (architecture.api.endpoints.length > 0) {
      const missingRateLimit = architecture.api.endpoints.filter(e => !e.rateLimit);
      if (missingRateLimit.length > architecture.api.endpoints.length / 2) {
        suggestions.push({
          id: this.generateId(),
          category: 'security',
          title: 'Add Rate Limiting',
          description: 'Most API endpoints should have rate limiting.',
          reason: 'Rate limiting prevents abuse and ensures fair usage.',
          priority: 'high',
          effort: 'medium',
          impact: 9,
          source: 'rule',
          confidence: 90,
          tags: ['api', 'security', 'rate-limiting'],
        });
      }
    }

    // Check integrations for common patterns
    if (context.industry === 'ecommerce' && !architecture.integrations.some(i => i.service === 'stripe')) {
      suggestions.push({
        id: this.generateId(),
        category: 'feature',
        title: 'Add Payment Processing',
        description: 'E-commerce applications typically need payment processing.',
        reason: 'Stripe is a reliable and well-documented payment solution.',
        priority: 'high',
        effort: 'high',
        impact: 10,
        source: 'industry',
        confidence: 85,
        tags: ['payments', 'ecommerce', 'integration'],
      });
    }

    return suggestions;
  }

  // ============ DESIGN ANALYSIS ============

  private async analyzeDesign(
    design: DesignOutput,
    context: SuggestionContext
  ): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Color analysis
    const palette = design.colorScheme.palette;

    // Check color contrast
    const primaryContrast = this.calculateContrast(
      palette.primary['500'] || palette.primary['DEFAULT'],
      design.colorScheme.semantic.background
    );

    if (primaryContrast < 4.5) {
      suggestions.push({
        id: this.generateId(),
        category: 'accessibility',
        title: 'Improve Color Contrast',
        description: 'Primary color may not have sufficient contrast against background.',
        reason: 'WCAG 2.1 AA requires minimum 4.5:1 contrast ratio for text.',
        priority: 'critical',
        effort: 'low',
        impact: 9,
        currentValue: `Contrast: ${primaryContrast.toFixed(2)}:1`,
        suggestedValue: 'Minimum 4.5:1',
        source: 'rule',
        confidence: 95,
        tags: ['accessibility', 'color', 'wcag'],
      });
    }

    // Typography analysis
    const typography = design.typography;
    
    if (typography.lineHeights.normal < 1.4) {
      suggestions.push({
        id: this.generateId(),
        category: 'typography',
        title: 'Increase Body Line Height',
        description: 'Line height for body text could be more readable.',
        reason: 'Optimal line height for body text is 1.5-1.7.',
        priority: 'medium',
        effort: 'trivial',
        impact: 6,
        currentValue: String(typography.lineHeights.normal),
        suggestedValue: '1.6',
        autoApply: true,
        source: 'rule',
        confidence: 85,
        tags: ['typography', 'readability'],
      });
    }

    // Check font weights
    const totalWeights = typography.fontFamilies.heading.weights.length + 
                        typography.fontFamilies.body.weights.length;
    if (totalWeights > 6) {
      suggestions.push({
        id: this.generateId(),
        category: 'performance',
        title: 'Reduce Font Weights',
        description: 'Loading many font weights impacts performance.',
        reason: 'Each font weight adds 20-50KB to page load.',
        priority: 'medium',
        effort: 'low',
        impact: 6,
        currentValue: `${totalWeights} weights`,
        suggestedValue: '4-5 weights maximum',
        source: 'rule',
        confidence: 80,
        tags: ['performance', 'fonts'],
      });
    }

    // Animation analysis
    if (!design.accessibility.reducedMotion) {
      suggestions.push({
        id: this.generateId(),
        category: 'accessibility',
        title: 'Support Reduced Motion',
        description: 'Add prefers-reduced-motion media query support.',
        reason: 'Users with vestibular disorders may experience discomfort.',
        priority: 'high',
        effort: 'low',
        impact: 8,
        code: '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }',
        autoApply: true,
        source: 'rule',
        confidence: 95,
        tags: ['accessibility', 'animation', 'motion'],
      });
    }

    // Layout analysis
    if (design.layout.grid.columns !== 12) {
      suggestions.push({
        id: this.generateId(),
        category: 'layout',
        title: 'Use 12-Column Grid',
        description: '12-column grid offers more layout flexibility.',
        reason: '12 divides evenly by 2, 3, 4, and 6 for flexible responsive layouts.',
        priority: 'low',
        effort: 'medium',
        impact: 5,
        currentValue: `${design.layout.grid.columns} columns`,
        suggestedValue: '12 columns',
        source: 'rule',
        confidence: 70,
        tags: ['layout', 'grid', 'responsive'],
      });
    }

    // Dark mode suggestion
    if (!design.colorScheme.darkMode) {
      suggestions.push({
        id: this.generateId(),
        category: 'ux',
        title: 'Add Dark Mode Support',
        description: 'Dark mode is increasingly expected by users.',
        reason: '67% of users prefer dark mode; it reduces eye strain.',
        priority: 'medium',
        effort: 'medium',
        impact: 7,
        source: 'analytics',
        confidence: 75,
        tags: ['dark-mode', 'ux', 'theme'],
      });
    }

    return suggestions;
  }

  // ============ UX ANALYSIS ============

  private async analyzeUX(
    architecture: ArchitectureOutput,
    design: DesignOutput | null,
    context: SuggestionContext
  ): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Navigation depth
    const maxDepth = this.calculateNavigationDepth(architecture);
    if (maxDepth > 3) {
      suggestions.push({
        id: this.generateId(),
        category: 'ux',
        title: 'Reduce Navigation Depth',
        description: 'Deep navigation hierarchies confuse users.',
        reason: 'Users should reach any content within 3 clicks.',
        priority: 'medium',
        effort: 'medium',
        impact: 7,
        currentValue: `${maxDepth} levels`,
        suggestedValue: '3 levels maximum',
        source: 'rule',
        confidence: 85,
        tags: ['navigation', 'ux', 'information-architecture'],
      });
    }

    // Form page suggestions
    const formPages = architecture.pages.filter(p => 
      p.sections.some(s => s.type === 'form')
    );
    
    for (const page of formPages) {
      if (!page.sections.some(s => s.components.includes('progress') || s.components.includes('stepper'))) {
        suggestions.push({
          id: this.generateId(),
          category: 'ux',
          title: `Add Progress Indicator to ${page.name}`,
          description: 'Multi-step forms benefit from progress indicators.',
          reason: 'Progress indicators reduce form abandonment by 20%.',
          priority: 'medium',
          effort: 'low',
          impact: 7,
          source: 'analytics',
          confidence: 80,
          tags: ['forms', 'ux', 'conversion'],
        });
      }
    }

    // Loading state suggestions
    if (design && !design.animations.keyframes.some(k => 
      k.name.includes('skeleton') || k.name.includes('pulse') || k.name.includes('shimmer')
    )) {
      suggestions.push({
        id: this.generateId(),
        category: 'ux',
        title: 'Add Skeleton Loading States',
        description: 'Skeleton screens improve perceived performance.',
        reason: 'Skeleton loading reduces perceived load time by 31%.',
        priority: 'medium',
        effort: 'medium',
        impact: 7,
        source: 'analytics',
        confidence: 85,
        tags: ['loading', 'ux', 'performance'],
      });
    }

    // Mobile-first suggestions
    if (design?.responsive.strategy !== 'mobile-first') {
      suggestions.push({
        id: this.generateId(),
        category: 'ux',
        title: 'Consider Mobile-First Approach',
        description: 'Mobile traffic often exceeds desktop traffic.',
        reason: '60%+ of web traffic comes from mobile devices.',
        priority: 'medium',
        effort: 'high',
        impact: 8,
        source: 'analytics',
        confidence: 75,
        tags: ['mobile', 'responsive', 'strategy'],
      });
    }

    // Call-to-action suggestions
    const ctaSections = architecture.pages.flatMap(p => 
      p.sections.filter(s => s.type === 'cta' || s.type === 'hero')
    );
    
    if (ctaSections.length === 0) {
      suggestions.push({
        id: this.generateId(),
        category: 'conversion',
        title: 'Add Call-to-Action Sections',
        description: 'Pages without CTAs have lower conversion rates.',
        reason: 'Clear CTAs guide users toward desired actions.',
        priority: 'high',
        effort: 'low',
        impact: 9,
        source: 'analytics',
        confidence: 90,
        tags: ['cta', 'conversion', 'marketing'],
      });
    }

    return suggestions;
  }

  // ============ INDUSTRY-SPECIFIC SUGGESTIONS ============

  private async getIndustrySuggestions(
    industry: string | undefined,
    architecture: ArchitectureOutput
  ): Promise<Suggestion[]> {
    if (!industry) return [];

    const suggestions: Suggestion[] = [];

    const industryPatterns: Record<string, Suggestion[]> = {
      ecommerce: [
        {
          id: this.generateId(),
          category: 'conversion',
          title: 'Add Trust Badges',
          description: 'Display security and payment trust badges.',
          reason: 'Trust badges can increase conversions by 42%.',
          priority: 'high',
          effort: 'low',
          impact: 8,
          source: 'industry',
          confidence: 85,
          tags: ['trust', 'conversion', 'ecommerce'],
        },
        {
          id: this.generateId(),
          category: 'ux',
          title: 'Implement Quick View',
          description: 'Allow product preview without leaving the list.',
          reason: 'Quick view reduces bounce rate on product listings.',
          priority: 'medium',
          effort: 'medium',
          impact: 6,
          source: 'industry',
          confidence: 75,
          tags: ['product', 'ux', 'ecommerce'],
        },
        {
          id: this.generateId(),
          category: 'conversion',
          title: 'Add Abandoned Cart Recovery',
          description: 'Send reminders for incomplete purchases.',
          reason: '69% of shopping carts are abandoned; recovery emails can recover 10-15%.',
          priority: 'high',
          effort: 'high',
          impact: 9,
          source: 'industry',
          confidence: 90,
          tags: ['cart', 'conversion', 'email'],
        },
      ],
      saas: [
        {
          id: this.generateId(),
          category: 'conversion',
          title: 'Add Free Trial Flow',
          description: 'Offer a free trial without requiring credit card.',
          reason: 'Free trials without CC have 2x higher signup rates.',
          priority: 'high',
          effort: 'high',
          impact: 9,
          source: 'industry',
          confidence: 85,
          tags: ['trial', 'conversion', 'saas'],
        },
        {
          id: this.generateId(),
          category: 'ux',
          title: 'Add In-App Onboarding',
          description: 'Guide new users through key features.',
          reason: 'Good onboarding increases retention by 50%.',
          priority: 'high',
          effort: 'high',
          impact: 9,
          source: 'industry',
          confidence: 90,
          tags: ['onboarding', 'ux', 'retention'],
        },
        {
          id: this.generateId(),
          category: 'feature',
          title: 'Add Usage Analytics Dashboard',
          description: 'Show users their usage and value gained.',
          reason: 'Usage visibility increases perceived value and retention.',
          priority: 'medium',
          effort: 'high',
          impact: 7,
          source: 'industry',
          confidence: 80,
          tags: ['analytics', 'dashboard', 'saas'],
        },
      ],
      healthcare: [
        {
          id: this.generateId(),
          category: 'accessibility',
          title: 'Enhance Accessibility Beyond WCAG AA',
          description: 'Healthcare sites should exceed minimum standards.',
          reason: 'Users may have visual, motor, or cognitive impairments.',
          priority: 'critical',
          effort: 'high',
          impact: 10,
          source: 'industry',
          confidence: 95,
          tags: ['accessibility', 'healthcare', 'compliance'],
        },
        {
          id: this.generateId(),
          category: 'security',
          title: 'Implement HIPAA Compliance Features',
          description: 'Add audit logs, encryption, and access controls.',
          reason: 'HIPAA compliance is legally required for health data.',
          priority: 'critical',
          effort: 'complex',
          impact: 10,
          source: 'industry',
          confidence: 95,
          tags: ['hipaa', 'security', 'compliance'],
        },
      ],
      fintech: [
        {
          id: this.generateId(),
          category: 'security',
          title: 'Implement Strong MFA',
          description: 'Require multi-factor authentication for all users.',
          reason: 'Financial apps are high-value targets for attackers.',
          priority: 'critical',
          effort: 'medium',
          impact: 10,
          source: 'industry',
          confidence: 95,
          tags: ['mfa', 'security', 'fintech'],
        },
        {
          id: this.generateId(),
          category: 'typography',
          title: 'Use Tabular Numbers',
          description: 'Display financial figures with tabular numerals.',
          reason: 'Aligned numbers are easier to scan and compare.',
          priority: 'medium',
          effort: 'low',
          impact: 5,
          code: 'font-variant-numeric: tabular-nums;',
          autoApply: true,
          source: 'industry',
          confidence: 85,
          tags: ['typography', 'numbers', 'fintech'],
        },
      ],
      education: [
        {
          id: this.generateId(),
          category: 'ux',
          title: 'Add Progress Tracking',
          description: 'Show learning progress across courses.',
          reason: 'Progress tracking increases course completion by 40%.',
          priority: 'high',
          effort: 'high',
          impact: 9,
          source: 'industry',
          confidence: 90,
          tags: ['progress', 'gamification', 'education'],
        },
        {
          id: this.generateId(),
          category: 'feature',
          title: 'Add Achievement Badges',
          description: 'Reward users for completing milestones.',
          reason: 'Gamification increases engagement by 60%.',
          priority: 'medium',
          effort: 'medium',
          impact: 7,
          source: 'industry',
          confidence: 80,
          tags: ['gamification', 'engagement', 'education'],
        },
      ],
    };

    const industrySuggestions = industryPatterns[industry.toLowerCase()];
    if (industrySuggestions) {
      suggestions.push(...industrySuggestions);
    }

    return suggestions;
  }

  // ============ PERFORMANCE ANALYSIS ============

  private async analyzePerformance(
    architecture: ArchitectureOutput,
    design: DesignOutput | null
  ): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Large number of pages
    if (architecture.pages.length > 20) {
      suggestions.push({
        id: this.generateId(),
        category: 'performance',
        title: 'Implement Route-Based Code Splitting',
        description: 'Large applications benefit from code splitting.',
        reason: 'Code splitting reduces initial bundle size significantly.',
        priority: 'high',
        effort: 'medium',
        impact: 8,
        source: 'rule',
        confidence: 90,
        tags: ['code-splitting', 'performance', 'bundle'],
      });
    }

    // Image optimization
    const galleryPages = architecture.pages.filter(p =>
      p.sections.some(s => s.type === 'gallery')
    );
    if (galleryPages.length > 0) {
      suggestions.push({
        id: this.generateId(),
        category: 'performance',
        title: 'Optimize Gallery Images',
        description: 'Use next/image with lazy loading for galleries.',
        reason: 'Image optimization can reduce page weight by 50%.',
        priority: 'high',
        effort: 'low',
        impact: 8,
        source: 'rule',
        confidence: 90,
        tags: ['images', 'performance', 'optimization'],
      });
    }

    // CDN suggestion
    if (!architecture.infrastructure.cdn) {
      suggestions.push({
        id: this.generateId(),
        category: 'performance',
        title: 'Enable CDN',
        description: 'Use a CDN for static assets and edge caching.',
        reason: 'CDN reduces latency for users worldwide.',
        priority: 'medium',
        effort: 'low',
        impact: 7,
        source: 'rule',
        confidence: 85,
        tags: ['cdn', 'performance', 'infrastructure'],
      });
    }

    return suggestions;
  }

  // ============ ACCESSIBILITY ANALYSIS ============

  private async analyzeAccessibility(
    architecture: ArchitectureOutput,
    design: DesignOutput | null
  ): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Form accessibility
    const formPages = architecture.pages.filter(p =>
      p.sections.some(s => s.type === 'form' || s.type === 'contact')
    );
    
    if (formPages.length > 0) {
      suggestions.push({
        id: this.generateId(),
        category: 'accessibility',
        title: 'Add Form Error Announcements',
        description: 'Use aria-live regions to announce form errors.',
        reason: 'Screen reader users need to be notified of errors.',
        priority: 'high',
        effort: 'low',
        impact: 8,
        code: '<div aria-live="polite" aria-atomic="true">{errorMessage}</div>',
        source: 'rule',
        confidence: 90,
        tags: ['forms', 'accessibility', 'aria'],
      });
    }

    // Skip link suggestion
    suggestions.push({
      id: this.generateId(),
      category: 'accessibility',
      title: 'Add Skip Navigation Link',
      description: 'Add a skip link for keyboard users.',
      reason: 'Skip links help keyboard users bypass repetitive content.',
      priority: 'medium',
      effort: 'trivial',
      impact: 7,
      code: '<a href="#main-content" className="sr-only focus:not-sr-only">Skip to main content</a>',
      autoApply: true,
      source: 'rule',
      confidence: 95,
      tags: ['navigation', 'accessibility', 'keyboard'],
    });

    // Focus management
    if (design?.accessibility.focusIndicators && !design.accessibility.focusIndicators.includes('ring')) {
      suggestions.push({
        id: this.generateId(),
        category: 'accessibility',
        title: 'Improve Focus Indicators',
        description: 'Make focus states more visible.',
        reason: 'Clear focus indicators are essential for keyboard navigation.',
        priority: 'high',
        effort: 'low',
        impact: 8,
        suggestedValue: 'ring-2 ring-offset-2 ring-primary-500',
        source: 'rule',
        confidence: 90,
        tags: ['focus', 'accessibility', 'keyboard'],
      });
    }

    return suggestions;
  }

  // ============ SEO ANALYSIS ============

  private async analyzeSEO(architecture: ArchitectureOutput): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Meta description analysis
    for (const page of architecture.pages) {
      if (!page.seo.description || page.seo.description.length < 120) {
        suggestions.push({
          id: this.generateId(),
          category: 'seo',
          title: `Improve Meta Description for ${page.name}`,
          description: 'Meta description is too short or missing.',
          reason: 'Good meta descriptions improve click-through rates.',
          priority: 'medium',
          effort: 'low',
          impact: 6,
          currentValue: page.seo.description || '(empty)',
          suggestedValue: '150-160 characters describing page content',
          source: 'rule',
          confidence: 85,
          tags: ['seo', 'meta', 'content'],
        });
      }

      if (!page.seo.keywords || page.seo.keywords.length < 3) {
        suggestions.push({
          id: this.generateId(),
          category: 'seo',
          title: `Add Keywords for ${page.name}`,
          description: 'Add relevant keywords for search optimization.',
          reason: 'Keywords help search engines understand page content.',
          priority: 'low',
          effort: 'low',
          impact: 4,
          source: 'rule',
          confidence: 70,
          tags: ['seo', 'keywords', 'content'],
        });
      }
    }

    // Structured data suggestion
    suggestions.push({
      id: this.generateId(),
      category: 'seo',
      title: 'Add Structured Data',
      description: 'Implement JSON-LD structured data for rich results.',
      reason: 'Structured data can improve search visibility by 30%.',
      priority: 'medium',
      effort: 'medium',
      impact: 7,
      documentation: 'https://schema.org/docs/gs.html',
      source: 'rule',
      confidence: 85,
      tags: ['seo', 'structured-data', 'schema'],
    });

    return suggestions;
  }

  // ============ CONVERSION ANALYSIS ============

  private async analyzeConversion(
    architecture: ArchitectureOutput,
    design: DesignOutput | null,
    context: SuggestionContext
  ): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Pricing page analysis
    const pricingPage = architecture.pages.find(p =>
      p.route.includes('pricing') || p.sections.some(s => s.type === 'pricing')
    );

    if (!pricingPage && architecture.authentication.required) {
      suggestions.push({
        id: this.generateId(),
        category: 'conversion',
        title: 'Add Pricing Page',
        description: 'Applications with subscriptions need clear pricing.',
        reason: 'Clear pricing pages increase conversion rates.',
        priority: 'high',
        effort: 'medium',
        impact: 9,
        source: 'rule',
        confidence: 85,
        tags: ['pricing', 'conversion', 'monetization'],
      });
    }

    // Social proof
    const testimonialSections = architecture.pages.flatMap(p =>
      p.sections.filter(s => s.type === 'testimonials')
    );

    if (testimonialSections.length === 0) {
      suggestions.push({
        id: this.generateId(),
        category: 'conversion',
        title: 'Add Social Proof',
        description: 'Include testimonials or customer logos.',
        reason: 'Social proof can increase conversions by 15%.',
        priority: 'high',
        effort: 'medium',
        impact: 8,
        source: 'analytics',
        confidence: 85,
        tags: ['testimonials', 'social-proof', 'conversion'],
      });
    }

    // Analytics-based suggestions
    if (context.analytics) {
      if (context.analytics.bounceRate && context.analytics.bounceRate > 60) {
        suggestions.push({
          id: this.generateId(),
          category: 'conversion',
          title: 'Reduce Bounce Rate',
          description: 'High bounce rate indicates content or UX issues.',
          reason: `Current bounce rate: ${context.analytics.bounceRate}%`,
          priority: 'critical',
          effort: 'high',
          impact: 9,
          source: 'analytics',
          confidence: 90,
          tags: ['bounce-rate', 'analytics', 'ux'],
        });
      }

      if (context.analytics.conversionRate && context.analytics.conversionRate < 2) {
        suggestions.push({
          id: this.generateId(),
          category: 'conversion',
          title: 'Optimize Conversion Funnel',
          description: 'Low conversion rate suggests funnel optimization needed.',
          reason: `Current conversion rate: ${context.analytics.conversionRate}%`,
          priority: 'critical',
          effort: 'high',
          impact: 10,
          source: 'analytics',
          confidence: 90,
          tags: ['conversion', 'funnel', 'optimization'],
        });
      }
    }

    return suggestions;
  }

  // ============ AI-POWERED SUGGESTIONS ============

  async getAISuggestions(
    architecture: ArchitectureOutput,
    design: DesignOutput | null,
    context: SuggestionContext
  ): Promise<Suggestion[]> {
    const prompt = this.buildAISuggestionPrompt(architecture, design, context);

    const response = await this.llm.complete(this.config, [
      {
        role: 'system',
        content: `You are an expert UX consultant. Analyze the application and provide specific, actionable suggestions for improvement. Focus on high-impact, practical recommendations.

Return suggestions as a JSON array with this structure:
[{
  "category": "ux|conversion|performance|accessibility|seo|security",
  "title": "Brief title",
  "description": "What to do",
  "reason": "Why it matters with data if available",
  "priority": "critical|high|medium|low",
  "effort": "trivial|low|medium|high|complex",
  "impact": 1-10
}]`,
      },
      { role: 'user', content: prompt },
    ], {});

    try {
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((s: any) => ({
          ...s,
          id: this.generateId(),
          source: 'ai',
          confidence: 70,
          tags: [s.category],
        }));
      }
    } catch {
      logger.warn('Failed to parse AI suggestions');
    }

    return [];
  }

  private buildAISuggestionPrompt(
    architecture: ArchitectureOutput,
    design: DesignOutput | null,
    context: SuggestionContext
  ): string {
    return `Analyze this application and provide improvement suggestions:

Application: ${architecture.metadata.appName}
Industry: ${architecture.metadata.industry}
Target Audience: ${architecture.metadata.targetAudience}
Complexity: ${architecture.metadata.complexity}

Pages: ${architecture.pages.map(p => p.name).join(', ')}
Features: ${architecture.features.map(f => f.name).join(', ')}

${context.goals ? `Goals: ${context.goals.join(', ')}` : ''}
${context.competitors ? `Competitors: ${context.competitors.join(', ')}` : ''}

Provide 5-10 specific, actionable suggestions for improvement.`;
  }

  // ============ UTILITY METHODS ============

  private calculateContrast(color1: string, color2: string): number {
    const getLuminance = (hex: string): number => {
      const rgb = this.hexToRgb(hex);
      if (!rgb) return 0;
      const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null;
  }

  private calculateNavigationDepth(architecture: ArchitectureOutput): number {
    let maxDepth = 1;
    for (const page of architecture.pages) {
      const depth = page.route.split('/').filter(Boolean).length;
      maxDepth = Math.max(maxDepth, depth);
    }
    return maxDepth;
  }

  private async filterDismissed(
    suggestions: Suggestion[],
    dismissed: string[]
  ): Promise<Suggestion[]> {
    return suggestions.filter(s => !dismissed.includes(s.id));
  }

  private prioritizeSuggestions(suggestions: Suggestion[]): Suggestion[] {
    const priorityOrder: Record<SuggestionPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    return suggestions.sort((a, b) => {
      // First by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by impact
      return b.impact - a.impact;
    });
  }

  private generateId(): string {
    return `sug_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export default SuggestionEngine;
