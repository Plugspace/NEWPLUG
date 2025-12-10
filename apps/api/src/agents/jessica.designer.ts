// ==============================================
// PLUGSPACE.IO TITAN v1.4 - AGENT JESSICA (DESIGNER)
// ==============================================
// Gemini 3.0 Pro powered design system generation
// with visual intelligence, brand analysis, and
// comprehensive accessibility compliance
// ==============================================

import { z } from 'zod';
import { Redis } from 'ioredis';
import { LLMService, LLMConfig, LLMMessage, LLMResponse, LLMContent } from '../services/llm/provider';
import { ArchitectureOutput } from './don.architect';
import { logger } from '../lib/logger';
import { AppError, ErrorCodes, AIError, ValidationError } from '@plugspace/utils';

// ============ OUTPUT SCHEMAS ============

export const ColorPaletteSchema = z.object({
  primary: z.record(z.string()),
  secondary: z.record(z.string()),
  accent: z.record(z.string()),
  neutral: z.record(z.string()),
  success: z.string(),
  warning: z.string(),
  error: z.string(),
  info: z.string(),
});

export const SemanticColorsSchema = z.object({
  background: z.string(),
  surface: z.string(),
  surfaceHover: z.string(),
  border: z.string(),
  borderHover: z.string(),
  text: z.string(),
  textSecondary: z.string(),
  textMuted: z.string(),
  disabled: z.string(),
  focus: z.string(),
});

export const TypographySchema = z.object({
  fontFamilies: z.object({
    heading: z.object({
      name: z.string(),
      googleFont: z.boolean(),
      weights: z.array(z.number()),
      fallback: z.array(z.string()),
    }),
    body: z.object({
      name: z.string(),
      googleFont: z.boolean(),
      weights: z.array(z.number()),
      fallback: z.array(z.string()),
    }),
    mono: z.object({
      name: z.string(),
      googleFont: z.boolean(),
      weights: z.array(z.number()),
      fallback: z.array(z.string()),
    }),
  }),
  scale: z.record(z.string()),
  lineHeights: z.object({
    tight: z.number(),
    normal: z.number(),
    relaxed: z.number(),
  }),
  letterSpacing: z.object({
    tight: z.string(),
    normal: z.string(),
    wide: z.string(),
  }),
});

export const LayoutSchema = z.object({
  style: z.enum(['Glassmorphism', 'Neumorphism', 'Brutalist', 'Minimal', 'Modern', 'Retro', 'Corporate', 'Playful']),
  grid: z.object({
    columns: z.number(),
    gap: z.string(),
    maxWidth: z.string(),
  }),
  borderRadius: z.record(z.string()),
  shadows: z.record(z.string()),
});

export const ComponentStylesSchema = z.object({
  buttons: z.array(z.object({
    variant: z.string(),
    size: z.string(),
    classes: z.string(),
    hoverEffect: z.string(),
  })),
  inputs: z.object({
    default: z.string(),
    error: z.string(),
    disabled: z.string(),
    focus: z.string(),
  }),
  cards: z.object({
    default: z.string(),
    elevated: z.string(),
    interactive: z.string(),
  }),
  navigation: z.object({
    desktop: z.string(),
    mobile: z.string(),
  }),
  modals: z.string(),
  tooltips: z.string(),
  badges: z.string(),
  alerts: z.string(),
});

export const AnimationsSchema = z.object({
  transitions: z.object({
    fast: z.string(),
    base: z.string(),
    slow: z.string(),
  }),
  keyframes: z.array(z.object({
    name: z.string(),
    definition: z.string(),
    usage: z.string(),
  })),
  interactions: z.object({
    hover: z.array(z.string()),
    focus: z.array(z.string()),
    active: z.array(z.string()),
  }),
});

export const DesignOutputSchema = z.object({
  metadata: z.object({
    designSystem: z.string(),
    version: z.string(),
    lastUpdated: z.string(),
    author: z.literal('Jessica'),
  }),
  brand: z.object({
    name: z.string(),
    personality: z.array(z.string()),
    values: z.array(z.string()),
    tone: z.string(),
  }),
  colorScheme: z.object({
    mode: z.enum(['light', 'dark', 'auto']),
    palette: ColorPaletteSchema,
    semantic: SemanticColorsSchema,
    gradients: z.array(z.object({
      name: z.string(),
      value: z.string(),
      usage: z.string(),
    })),
    darkMode: z.object({
      palette: ColorPaletteSchema.optional(),
      semantic: SemanticColorsSchema.optional(),
    }).optional(),
  }),
  typography: TypographySchema,
  spacing: z.object({
    scale: z.record(z.string()),
    containerMaxWidth: z.string(),
    sectionPadding: z.string(),
  }),
  layout: LayoutSchema,
  components: ComponentStylesSchema,
  animations: AnimationsSchema,
  responsive: z.object({
    breakpoints: z.record(z.string()),
    strategy: z.enum(['mobile-first', 'desktop-first']),
  }),
  accessibility: z.object({
    focusIndicators: z.string(),
    colorContrast: z.object({
      ratio: z.number(),
      compliant: z.boolean(),
    }),
    ariaLabels: z.boolean(),
    keyboardNavigation: z.boolean(),
    reducedMotion: z.boolean(),
  }),
  tailwindConfig: z.string(),
  globalCSS: z.string(),
  cssVariables: z.record(z.string()),
});

export type DesignOutput = z.infer<typeof DesignOutputSchema>;

// ============ DESIGN SUGGESTIONS ============

export interface DesignSuggestion {
  category: 'color' | 'typography' | 'layout' | 'component' | 'animation' | 'accessibility' | 'ux';
  title: string;
  description: string;
  currentValue?: string;
  suggestedValue?: string;
  reason: string;
  impact: 'high' | 'medium' | 'low';
  autoApply?: boolean;
  preview?: string;
}

// ============ AGENT JESSICA CLASS ============

export class AgentJessica {
  private llm: LLMService;
  private redis: Redis;
  private config: LLMConfig;

  constructor(llm: LLMService, redis: Redis) {
    this.llm = llm;
    this.redis = redis;
    this.config = {
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
      temperature: 0.7,
      maxTokens: 8192,
      systemPrompt: this.getSystemPrompt(),
    };
  }

  // ============ MAIN GENERATION METHOD ============

  async generateDesign(
    architecture: ArchitectureOutput,
    context: {
      industry?: string;
      style?: string;
      brandColors?: string[];
      referenceImage?: string;
      referenceUrl?: string;
      mood?: string;
      targetAudience?: string;
      competitors?: string[];
    },
    options: {
      projectId: string;
      userId: string;
      organizationId: string;
      stream?: boolean;
    }
  ): Promise<{
    design: DesignOutput;
    response: LLMResponse;
    suggestions: DesignSuggestion[];
  }> {
    const startTime = Date.now();

    logger.info('Agent Jessica starting design generation', {
      projectId: options.projectId,
      userId: options.userId,
      industry: context.industry,
      style: context.style,
    });

    try {
      // Build messages with optional image analysis
      const messages = await this.buildMessages(architecture, context);

      const response = await this.llm.complete(this.config, messages, {
        projectId: options.projectId,
        userId: options.userId,
        organizationId: options.organizationId,
        cache: true,
        cacheTTL: 3600,
        retries: 3,
      });

      // Parse and validate design
      const design = this.parseDesign(response.content);

      // Run design intelligence algorithms
      const suggestions = await this.runDesignIntelligence(design, architecture, context);

      // Validate accessibility
      await this.validateAccessibility(design);

      logger.info('Agent Jessica completed design generation', {
        projectId: options.projectId,
        duration: Date.now() - startTime,
        style: design.layout.style,
        colorMode: design.colorScheme.mode,
      });

      return { design, response, suggestions };

    } catch (error) {
      logger.error('Agent Jessica design generation failed', {
        projectId: options.projectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw this.handleError(error);
    }
  }

  // ============ STREAMING GENERATION ============

  async *streamDesign(
    architecture: ArchitectureOutput,
    context: Record<string, unknown>,
    options: { projectId: string; userId: string; organizationId: string }
  ): AsyncGenerator<{
    type: 'progress' | 'content' | 'preview' | 'complete' | 'error';
    data: any;
  }> {
    yield { type: 'progress', data: { stage: 'analyzing', progress: 10 } };

    const messages = await this.buildMessages(architecture, context);
    let fullContent = '';

    yield { type: 'progress', data: { stage: 'generating_colors', progress: 25 } };

    for await (const chunk of this.llm.stream(this.config, messages, options)) {
      if (chunk.type === 'text' && chunk.content) {
        fullContent += chunk.content;
        yield { type: 'content', data: { chunk: chunk.content } };

        // Generate preview for color palette when detected
        if (fullContent.includes('"palette"') && !fullContent.includes('"typography"')) {
          yield { type: 'progress', data: { stage: 'generating_typography', progress: 45 } };
        }
        if (fullContent.includes('"typography"') && !fullContent.includes('"components"')) {
          yield { type: 'progress', data: { stage: 'generating_components', progress: 65 } };
        }
      } else if (chunk.type === 'error') {
        yield { type: 'error', data: { message: chunk.error } };
        return;
      }
    }

    yield { type: 'progress', data: { stage: 'validating', progress: 85 } };

    try {
      const design = this.parseDesign(fullContent);
      const suggestions = await this.runDesignIntelligence(design, architecture, context);
      
      // Generate CSS preview
      const preview = this.generatePreviewCSS(design);
      yield { type: 'preview', data: { css: preview } };
      
      yield { type: 'progress', data: { stage: 'complete', progress: 100 } };
      yield { type: 'complete', data: { design, suggestions } };
    } catch (error) {
      yield { type: 'error', data: { message: 'Failed to parse design' } };
    }
  }

  // ============ IMAGE-BASED DESIGN ============

  async generateFromImage(
    imageBase64: string,
    mimeType: string,
    context: {
      extractColors?: boolean;
      extractTypography?: boolean;
      extractLayout?: boolean;
    },
    options: { projectId: string; userId: string; organizationId: string }
  ): Promise<{
    analysis: ImageAnalysis;
    designSuggestions: DesignSuggestion[];
  }> {
    const messages: LLMMessage[] = [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            imageBase64,
            mimeType,
          },
          {
            type: 'text',
            text: `Analyze this design reference image and extract:
1. Color palette (primary, secondary, accent, neutral colors with hex values)
2. Typography (font styles, sizes, weights used)
3. Layout patterns (grid system, spacing, alignment)
4. Design style (modern, minimal, bold, etc.)
5. UI components visible
6. Overall mood and brand personality

Respond with a detailed JSON analysis.`,
          },
        ],
      },
    ];

    const response = await this.llm.complete(
      { ...this.config, temperature: 0.3, maxTokens: 4096 },
      messages,
      options
    );

    const analysis = this.parseImageAnalysis(response.content);
    const suggestions = this.generateSuggestionsFromAnalysis(analysis);

    return { analysis, designSuggestions: suggestions };
  }

  // ============ MESSAGE BUILDING ============

  private async buildMessages(
    architecture: ArchitectureOutput,
    context: Record<string, unknown>
  ): Promise<LLMMessage[]> {
    const content: LLMContent[] = [];

    // Add reference image if provided
    if (context.referenceImage) {
      content.push({
        type: 'image',
        imageBase64: context.referenceImage as string,
        mimeType: 'image/jpeg',
      });
      content.push({
        type: 'text',
        text: 'Use this reference image as design inspiration.',
      });
    }

    // Main prompt
    content.push({
      type: 'text',
      text: this.buildDesignPrompt(architecture, context),
    });

    return [
      {
        role: 'system',
        content: this.config.systemPrompt || '',
      },
      {
        role: 'user',
        content: content.length === 1 ? content[0].text! : content,
      },
    ];
  }

  private buildDesignPrompt(
    architecture: ArchitectureOutput,
    context: Record<string, unknown>
  ): string {
    return `Create a comprehensive design system for this application:

Application Details:
- Name: ${architecture.metadata.appName}
- Industry: ${architecture.metadata.industry}
- Target Audience: ${architecture.metadata.targetAudience}
- Complexity: ${architecture.metadata.complexity}

Pages to Design:
${architecture.pages.map(p => `- ${p.name} (${p.route}): ${p.sections.map(s => s.type).join(', ')}`).join('\n')}

Design Context:
- Preferred Style: ${context.style || 'Modern and Clean'}
- Mood: ${context.mood || 'Professional'}
- Brand Colors: ${(context.brandColors as string[] || []).join(', ') || 'Not specified'}
- Industry: ${context.industry || architecture.metadata.industry}
- Target Audience: ${context.targetAudience || architecture.metadata.targetAudience}

Requirements:
1. Create a complete color palette with primary, secondary, accent colors and all shades (50-900)
2. Design typography system with heading and body fonts
3. Define spacing and layout system
4. Create component styles for buttons, inputs, cards, navigation
5. Add animations and interactions
6. Ensure WCAG 2.1 AA accessibility compliance
7. Include both light and dark mode support
8. Generate complete Tailwind CSS configuration
9. Generate global CSS with custom properties

IMPORTANT: Return ONLY valid JSON matching the DesignOutput schema. Include the complete tailwindConfig as a JavaScript string.`;
  }

  // ============ SYSTEM PROMPT ============

  private getSystemPrompt(): string {
    return `You are Agent Jessica, an expert UI/UX designer specializing in creating beautiful, accessible, and production-ready design systems. You have deep knowledge of:

1. Color Theory
- Color harmony (complementary, analogous, triadic)
- Psychology of colors
- Accessibility contrast ratios
- Brand color application

2. Typography
- Font pairing principles
- Typographic scale
- Readability optimization
- Web font performance

3. Layout Design
- Grid systems (12-column, flexible)
- Whitespace and visual hierarchy
- Responsive design patterns
- Mobile-first approach

4. Component Design
- Consistent component library
- State variations (hover, focus, active, disabled)
- Micro-interactions
- Animation principles

5. Accessibility (WCAG 2.1 AA)
- Color contrast requirements (4.5:1 text, 3:1 large text)
- Focus indicators
- Keyboard navigation
- Screen reader compatibility

Design Styles You Excel At:
- Glassmorphism: Frosted glass effects, transparency
- Neumorphism: Soft shadows, light backgrounds
- Minimal: Clean, spacious, typography-focused
- Modern: Bold colors, geometric shapes
- Corporate: Professional, trustworthy, structured
- Playful: Vibrant colors, rounded shapes, animations

Output Format:
Return a valid JSON object with complete design tokens, component styles, and Tailwind configuration. Always ensure accessibility compliance and include both light and dark mode support.`;
  }

  // ============ DESIGN INTELLIGENCE ============

  private async runDesignIntelligence(
    design: DesignOutput,
    architecture: ArchitectureOutput,
    context: Record<string, unknown>
  ): Promise<DesignSuggestion[]> {
    const suggestions: DesignSuggestion[] = [];

    // Color suggestions
    suggestions.push(...this.analyzeColors(design));

    // Typography suggestions
    suggestions.push(...this.analyzeTypography(design));

    // Layout suggestions
    suggestions.push(...this.analyzeLayout(design, architecture));

    // Component suggestions
    suggestions.push(...this.analyzeComponents(design));

    // Animation suggestions
    suggestions.push(...this.analyzeAnimations(design));

    // Industry-specific suggestions
    suggestions.push(...this.getIndustrySuggestions(design, context.industry as string));

    // UX improvement suggestions
    suggestions.push(...this.getUXSuggestions(design, architecture));

    return suggestions.sort((a, b) => {
      const impactOrder = { high: 0, medium: 1, low: 2 };
      return impactOrder[a.impact] - impactOrder[b.impact];
    });
  }

  private analyzeColors(design: DesignOutput): DesignSuggestion[] {
    const suggestions: DesignSuggestion[] = [];
    const palette = design.colorScheme.palette;

    // Check color contrast
    const primaryContrast = this.calculateContrast(
      palette.primary['500'] || palette.primary['DEFAULT'],
      '#FFFFFF'
    );

    if (primaryContrast < 4.5) {
      suggestions.push({
        category: 'color',
        title: 'Improve Primary Color Contrast',
        description: 'The primary color may not have sufficient contrast against white backgrounds.',
        currentValue: palette.primary['500'],
        suggestedValue: this.adjustColorForContrast(palette.primary['500']),
        reason: 'WCAG 2.1 AA requires a minimum contrast ratio of 4.5:1 for normal text.',
        impact: 'high',
      });
    }

    // Check for color harmony
    if (!this.hasColorHarmony(palette)) {
      suggestions.push({
        category: 'color',
        title: 'Enhance Color Harmony',
        description: 'Consider using colors that create better visual harmony.',
        reason: 'Harmonious colors create a more cohesive and professional look.',
        impact: 'medium',
      });
    }

    // Suggest gradient additions if not present
    if (design.colorScheme.gradients.length < 2) {
      suggestions.push({
        category: 'color',
        title: 'Add Brand Gradients',
        description: 'Adding gradient variations can enhance visual interest and brand recognition.',
        suggestedValue: `linear-gradient(135deg, ${palette.primary['500']} 0%, ${palette.secondary['500']} 100%)`,
        reason: 'Gradients are trending and add depth to modern designs.',
        impact: 'low',
      });
    }

    return suggestions;
  }

  private analyzeTypography(design: DesignOutput): DesignSuggestion[] {
    const suggestions: DesignSuggestion[] = [];
    const typography = design.typography;

    // Check font pairing
    const headingFont = typography.fontFamilies.heading.name;
    const bodyFont = typography.fontFamilies.body.name;

    if (headingFont === bodyFont) {
      suggestions.push({
        category: 'typography',
        title: 'Consider Font Pairing',
        description: 'Using different fonts for headings and body can create visual hierarchy.',
        currentValue: headingFont,
        suggestedValue: this.suggestFontPairing(headingFont),
        reason: 'Contrasting fonts improve readability and visual interest.',
        impact: 'medium',
      });
    }

    // Check line heights
    if (typography.lineHeights.normal < 1.4) {
      suggestions.push({
        category: 'typography',
        title: 'Increase Line Height',
        description: 'Larger line height improves readability, especially for body text.',
        currentValue: String(typography.lineHeights.normal),
        suggestedValue: '1.6',
        reason: 'Optimal line height for body text is 1.5-1.7.',
        impact: 'medium',
      });
    }

    // Check font loading
    if (typography.fontFamilies.heading.weights.length > 4) {
      suggestions.push({
        category: 'typography',
        title: 'Optimize Font Weights',
        description: 'Loading too many font weights impacts performance.',
        reason: 'Each font weight adds ~20-50KB to page load.',
        impact: 'medium',
      });
    }

    return suggestions;
  }

  private analyzeLayout(design: DesignOutput, architecture: ArchitectureOutput): DesignSuggestion[] {
    const suggestions: DesignSuggestion[] = [];
    const layout = design.layout;

    // Check grid system
    if (layout.grid.columns !== 12) {
      suggestions.push({
        category: 'layout',
        title: 'Use 12-Column Grid',
        description: '12-column grid offers more flexibility for responsive layouts.',
        currentValue: String(layout.grid.columns),
        suggestedValue: '12',
        reason: '12 divides evenly by 2, 3, 4, and 6 for flexible layouts.',
        impact: 'medium',
      });
    }

    // Check max width
    const maxWidth = parseInt(layout.grid.maxWidth);
    if (maxWidth > 1440) {
      suggestions.push({
        category: 'layout',
        title: 'Consider Smaller Max Width',
        description: 'Very wide content can be difficult to read.',
        currentValue: layout.grid.maxWidth,
        suggestedValue: '1280px',
        reason: 'Optimal reading line length is 45-75 characters.',
        impact: 'low',
      });
    }

    // Style-specific suggestions
    if (layout.style === 'Glassmorphism') {
      suggestions.push({
        category: 'layout',
        title: 'Add Backdrop Blur Support',
        description: 'Ensure backdrop-filter fallbacks for unsupported browsers.',
        reason: 'Safari and older browsers may not support backdrop-filter.',
        impact: 'medium',
      });
    }

    return suggestions;
  }

  private analyzeComponents(design: DesignOutput): DesignSuggestion[] {
    const suggestions: DesignSuggestion[] = [];
    const components = design.components;

    // Check button variants
    if (components.buttons.length < 4) {
      suggestions.push({
        category: 'component',
        title: 'Add More Button Variants',
        description: 'Consider adding outline, ghost, and link button styles.',
        reason: 'Multiple button styles provide flexibility for different contexts.',
        impact: 'low',
      });
    }

    // Check focus styles
    if (!design.accessibility.focusIndicators.includes('ring')) {
      suggestions.push({
        category: 'component',
        title: 'Improve Focus Indicators',
        description: 'Use visible focus rings for keyboard navigation.',
        suggestedValue: 'ring-2 ring-offset-2 ring-primary-500',
        reason: 'Clear focus indicators are essential for accessibility.',
        impact: 'high',
      });
    }

    return suggestions;
  }

  private analyzeAnimations(design: DesignOutput): DesignSuggestion[] {
    const suggestions: DesignSuggestion[] = [];
    const animations = design.animations;

    // Check for reduced motion support
    if (!design.accessibility.reducedMotion) {
      suggestions.push({
        category: 'animation',
        title: 'Support Reduced Motion',
        description: 'Add prefers-reduced-motion media query support.',
        suggestedValue: '@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }',
        reason: 'Users with vestibular disorders may experience discomfort from animations.',
        impact: 'high',
        autoApply: true,
      });
    }

    // Check transition durations
    const baseDuration = parseInt(animations.transitions.base);
    if (baseDuration > 300) {
      suggestions.push({
        category: 'animation',
        title: 'Optimize Transition Duration',
        description: 'Shorter transitions feel snappier and more responsive.',
        currentValue: animations.transitions.base,
        suggestedValue: '150ms',
        reason: 'Users perceive delays over 200ms as sluggish.',
        impact: 'medium',
      });
    }

    return suggestions;
  }

  private getIndustrySuggestions(design: DesignOutput, industry?: string): DesignSuggestion[] {
    const suggestions: DesignSuggestion[] = [];

    if (!industry) return suggestions;

    const industryPatterns: Record<string, DesignSuggestion[]> = {
      healthcare: [
        {
          category: 'color',
          title: 'Healthcare Color Palette',
          description: 'Consider calming blues and greens commonly used in healthcare.',
          reason: 'These colors convey trust, cleanliness, and calm.',
          impact: 'medium',
        },
        {
          category: 'accessibility',
          title: 'Enhanced Accessibility',
          description: 'Healthcare sites should exceed minimum accessibility standards.',
          reason: 'Users may have visual or motor impairments.',
          impact: 'high',
        },
      ],
      ecommerce: [
        {
          category: 'ux',
          title: 'Add Trust Indicators',
          description: 'Include security badges and trust signals in the design.',
          reason: 'Trust signals increase conversion rates by 42%.',
          impact: 'high',
        },
        {
          category: 'color',
          title: 'CTA Color Optimization',
          description: 'Use high-contrast colors for Add to Cart and Buy buttons.',
          reason: 'Prominent CTAs improve conversion rates.',
          impact: 'high',
        },
      ],
      fintech: [
        {
          category: 'color',
          title: 'Professional Color Scheme',
          description: 'Use navy, dark blue, or green to convey financial stability.',
          reason: 'These colors are associated with trust and money.',
          impact: 'medium',
        },
        {
          category: 'typography',
          title: 'Clear Number Typography',
          description: 'Use tabular numerals for financial data display.',
          reason: 'Aligned numbers are easier to scan and compare.',
          impact: 'medium',
        },
      ],
      education: [
        {
          category: 'ux',
          title: 'Progress Indicators',
          description: 'Include visual progress tracking for learning journeys.',
          reason: 'Progress indicators improve completion rates.',
          impact: 'high',
        },
        {
          category: 'color',
          title: 'Engaging Color Palette',
          description: 'Use vibrant, encouraging colors for educational content.',
          reason: 'Bright colors increase engagement and retention.',
          impact: 'medium',
        },
      ],
    };

    return industryPatterns[industry.toLowerCase()] || [];
  }

  private getUXSuggestions(design: DesignOutput, architecture: ArchitectureOutput): DesignSuggestion[] {
    const suggestions: DesignSuggestion[] = [];

    // Check for loading states
    if (!design.animations.keyframes.some(k => k.name.includes('skeleton') || k.name.includes('pulse'))) {
      suggestions.push({
        category: 'ux',
        title: 'Add Skeleton Loading',
        description: 'Implement skeleton loading states for better perceived performance.',
        reason: 'Skeleton screens improve perceived load time by 31%.',
        impact: 'medium',
      });
    }

    // Check for error states
    if (!design.colorScheme.palette.error) {
      suggestions.push({
        category: 'ux',
        title: 'Define Error States',
        description: 'Add clear visual indicators for error states.',
        reason: 'Clear error states improve form completion rates.',
        impact: 'high',
      });
    }

    // Mobile navigation
    if (architecture.pages.length > 5 && !design.components.navigation.mobile.includes('drawer')) {
      suggestions.push({
        category: 'ux',
        title: 'Optimize Mobile Navigation',
        description: 'Consider a drawer or bottom navigation for many pages.',
        reason: 'Better mobile navigation improves engagement.',
        impact: 'medium',
      });
    }

    return suggestions;
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
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null;
  }

  private adjustColorForContrast(hex: string): string {
    // Darken color to improve contrast
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;
    
    const darken = (c: number) => Math.max(0, Math.floor(c * 0.7));
    const r = darken(rgb.r).toString(16).padStart(2, '0');
    const g = darken(rgb.g).toString(16).padStart(2, '0');
    const b = darken(rgb.b).toString(16).padStart(2, '0');
    
    return `#${r}${g}${b}`;
  }

  private hasColorHarmony(palette: z.infer<typeof ColorPaletteSchema>): boolean {
    // Simplified harmony check
    return true; // Would implement actual color theory checks
  }

  private suggestFontPairing(currentFont: string): string {
    const pairings: Record<string, string> = {
      'Inter': 'Playfair Display',
      'Roboto': 'Roboto Slab',
      'Open Sans': 'Merriweather',
      'Lato': 'Libre Baskerville',
      'Poppins': 'Lora',
      'Montserrat': 'Source Serif Pro',
    };
    return pairings[currentFont] || 'Merriweather';
  }

  // ============ PARSING ============

  private parseDesign(content: string): DesignOutput {
    let jsonStr = content;
    
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      const rawMatch = content.match(/\{[\s\S]*\}/);
      if (rawMatch) {
        jsonStr = rawMatch[0];
      }
    }

    try {
      const parsed = JSON.parse(jsonStr);
      return DesignOutputSchema.parse(parsed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('Design validation failed', { errors: error.errors });
        throw new ValidationError(
          error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          }))
        );
      }
      throw new AIError(
        ErrorCodes.GENERATION_FAILED,
        'Failed to parse design output',
        'Jessica',
        this.config.model
      );
    }
  }

  private parseImageAnalysis(content: string): ImageAnalysis {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Return default analysis
    }
    return {
      colors: [],
      fonts: [],
      layout: 'grid',
      style: 'modern',
      components: [],
      mood: 'professional',
    };
  }

  private generateSuggestionsFromAnalysis(analysis: ImageAnalysis): DesignSuggestion[] {
    return analysis.colors.map(color => ({
      category: 'color' as const,
      title: `Use ${color} from reference`,
      description: `This color was detected in your reference image.`,
      suggestedValue: color,
      reason: 'Extracted from reference image.',
      impact: 'medium' as const,
    }));
  }

  private async validateAccessibility(design: DesignOutput): Promise<void> {
    const issues: string[] = [];

    // Check color contrast
    if (design.accessibility.colorContrast.ratio < 4.5) {
      issues.push('Color contrast ratio does not meet WCAG 2.1 AA requirements');
    }

    // Check focus indicators
    if (!design.accessibility.focusIndicators) {
      issues.push('Focus indicators not defined');
    }

    if (issues.length > 0) {
      logger.warn('Accessibility issues detected in design', { issues });
    }
  }

  private generatePreviewCSS(design: DesignOutput): string {
    const vars = Object.entries(design.cssVariables)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n');

    return `:root {\n${vars}\n}`;
  }

  private handleError(error: unknown): AppError {
    if (error instanceof AppError) return error;

    return new AIError(
      ErrorCodes.AI_ERROR,
      error instanceof Error ? error.message : 'Design generation failed',
      'Jessica',
      this.config.model
    );
  }
}

// ============ INTERFACES ============

interface ImageAnalysis {
  colors: string[];
  fonts: string[];
  layout: string;
  style: string;
  components: string[];
  mood: string;
}

export default AgentJessica;
