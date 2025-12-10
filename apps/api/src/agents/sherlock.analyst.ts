// ==============================================
// PLUGSPACE.IO TITAN v1.4 - AGENT SHERLOCK (ANALYST)
// ==============================================
// Gemini 3.0 Pro powered website analysis
// with visual intelligence, competitive analysis,
// and design pattern extraction
// ==============================================

import { z } from 'zod';
import { Redis } from 'ioredis';
import puppeteer, { Browser, Page } from 'puppeteer';
import { LLMService, LLMConfig, LLMMessage, LLMContent } from '../services/llm/provider';
import { logger } from '../lib/logger';
import { AppError, ErrorCodes, AIError, ValidationError } from '@plugspace/utils';

// ============ OUTPUT SCHEMAS ============

export const TechnologyStackSchema = z.object({
  framework: z.string().optional(),
  libraries: z.array(z.string()),
  cms: z.string().optional(),
  hosting: z.string().optional(),
  cdn: z.string().optional(),
  analytics: z.array(z.string()),
});

export const ColorExtractionSchema = z.object({
  hex: z.string(),
  rgb: z.string(),
  hsl: z.string(),
  usage: z.enum(['primary', 'secondary', 'accent', 'neutral', 'background', 'text']),
  coverage: z.number(),
  sentiment: z.string().optional(),
});

export const TypographyExtractionSchema = z.object({
  family: z.string(),
  weights: z.array(z.number()),
  usage: z.enum(['heading', 'body', 'display', 'caption']),
  googleFont: z.boolean(),
});

export const ComponentExtractionSchema = z.object({
  type: z.string(),
  count: z.number(),
  examples: z.array(z.string()),
  variants: z.array(z.string()),
  html: z.string().optional(),
  css: z.string().optional(),
});

export const PerformanceMetricsSchema = z.object({
  loadTime: z.number(),
  pageSize: z.number(),
  requests: z.number(),
  lighthouse: z.object({
    performance: z.number(),
    accessibility: z.number(),
    bestPractices: z.number(),
    seo: z.number(),
  }).optional(),
});

export const AnalysisOutputSchema = z.object({
  metadata: z.object({
    url: z.string(),
    analyzedAt: z.string(),
    duration: z.number(),
    confidence: z.number(),
  }),
  screenshots: z.object({
    desktop: z.string(),
    tablet: z.string().optional(),
    mobile: z.string().optional(),
    fullPage: z.string().optional(),
  }),
  technology: TechnologyStackSchema,
  colorPalette: z.array(ColorExtractionSchema),
  typography: z.object({
    fonts: z.array(TypographyExtractionSchema),
    hierarchy: z.record(z.object({
      size: z.string(),
      weight: z.string(),
      lineHeight: z.string(),
    })),
  }),
  layout: z.object({
    pattern: z.enum(['grid', 'flexbox', 'float', 'absolute']),
    maxWidth: z.string(),
    columns: z.number(),
    gaps: z.array(z.string()),
    sections: z.array(z.object({
      type: z.string(),
      height: z.string(),
      background: z.string(),
    })),
  }),
  components: z.array(ComponentExtractionSchema),
  designStyle: z.object({
    overall: z.string(),
    keywords: z.array(z.string()),
    inspiration: z.array(z.string()),
  }),
  navigation: z.object({
    type: z.enum(['horizontal', 'vertical', 'mega', 'hamburger']),
    sticky: z.boolean(),
    animated: z.boolean(),
    items: z.number(),
  }),
  content: z.object({
    textContent: z.array(z.string()),
    images: z.array(z.object({
      src: z.string(),
      alt: z.string(),
      dimensions: z.object({ width: z.number(), height: z.number() }),
    })),
    ctaButtons: z.array(z.object({
      text: z.string(),
      style: z.string(),
      position: z.string(),
    })),
  }),
  performance: PerformanceMetricsSchema,
  seo: z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.array(z.string()),
    ogTags: z.record(z.string()),
  }),
  accessibility: z.object({
    score: z.number(),
    issues: z.array(z.object({
      type: z.string(),
      severity: z.string(),
      description: z.string(),
    })),
  }),
  recommendations: z.array(z.object({
    category: z.string(),
    suggestion: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    effort: z.enum(['low', 'medium', 'high']),
  })),
  competitiveInsights: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    opportunities: z.array(z.string()),
  }),
});

export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;

// ============ AGENT SHERLOCK CLASS ============

export class AgentSherlock {
  private llm: LLMService;
  private redis: Redis;
  private browser: Browser | null = null;
  private config: LLMConfig;

  constructor(llm: LLMService, redis: Redis) {
    this.llm = llm;
    this.redis = redis;
    this.config = {
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
      temperature: 0.3,
      maxTokens: 8192,
    };
  }

  // ============ MAIN ANALYSIS METHOD ============

  async analyzeWebsite(
    url: string,
    options: {
      projectId: string;
      userId: string;
      organizationId: string;
      depth?: number;
      includeScreenshots?: boolean;
      analyzeTech?: boolean;
      analyzeDesign?: boolean;
      analyzePerformance?: boolean;
    }
  ): Promise<{
    analysis: AnalysisOutput;
    rawData: RawWebsiteData;
  }> {
    const startTime = Date.now();

    logger.info('Agent Sherlock starting website analysis', {
      projectId: options.projectId,
      url,
    });

    try {
      // Validate URL
      const validatedUrl = this.validateUrl(url);

      // Check cache
      const cached = await this.getCachedAnalysis(validatedUrl);
      if (cached) {
        logger.info('Agent Sherlock using cached analysis', { url });
        return cached;
      }

      // Initialize browser
      await this.initBrowser();

      // Capture website data
      const rawData = await this.captureWebsiteData(validatedUrl, options);

      // Analyze with Gemini
      const analysis = await this.analyzeWithVision(rawData, options);

      // Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis);

      // Calculate confidence score
      analysis.metadata.confidence = this.calculateConfidence(analysis);
      analysis.metadata.duration = Date.now() - startTime;

      // Cache result
      await this.cacheAnalysis(validatedUrl, { analysis, rawData });

      logger.info('Agent Sherlock completed website analysis', {
        projectId: options.projectId,
        duration: analysis.metadata.duration,
        confidence: analysis.metadata.confidence,
      });

      return { analysis, rawData };

    } catch (error) {
      logger.error('Agent Sherlock analysis failed', {
        projectId: options.projectId,
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw this.handleError(error);
    } finally {
      await this.closeBrowser();
    }
  }

  // ============ STREAMING ANALYSIS ============

  async *streamAnalysis(
    url: string,
    options: {
      projectId: string;
      userId: string;
      organizationId: string;
    }
  ): AsyncGenerator<{
    type: 'progress' | 'screenshot' | 'data' | 'complete' | 'error';
    data: any;
  }> {
    yield { type: 'progress', data: { stage: 'initializing', progress: 5 } };

    try {
      const validatedUrl = this.validateUrl(url);
      await this.initBrowser();

      yield { type: 'progress', data: { stage: 'capturing', progress: 15 } };

      // Capture screenshots
      const page = await this.browser!.newPage();
      await page.goto(validatedUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      yield { type: 'progress', data: { stage: 'screenshot_desktop', progress: 25 } };
      const desktopScreenshot = await this.captureScreenshot(page, 'desktop');
      yield { type: 'screenshot', data: { viewport: 'desktop', image: desktopScreenshot } };

      yield { type: 'progress', data: { stage: 'screenshot_mobile', progress: 35 } };
      const mobileScreenshot = await this.captureScreenshot(page, 'mobile');
      yield { type: 'screenshot', data: { viewport: 'mobile', image: mobileScreenshot } };

      yield { type: 'progress', data: { stage: 'extracting', progress: 50 } };

      // Extract data
      const html = await page.content();
      const styles = await this.extractStyles(page);
      const scripts = await this.extractScripts(page);
      const metrics = await this.extractPerformanceMetrics(page);

      yield { type: 'data', data: { type: 'metrics', metrics } };

      yield { type: 'progress', data: { stage: 'analyzing', progress: 70 } };

      // Analyze with AI
      const rawData: RawWebsiteData = {
        url: validatedUrl,
        html,
        styles,
        scripts,
        screenshots: {
          desktop: desktopScreenshot,
          mobile: mobileScreenshot,
        },
        metrics,
      };

      const analysis = await this.analyzeWithVision(rawData, options);

      yield { type: 'progress', data: { stage: 'complete', progress: 100 } };
      yield { type: 'complete', data: { analysis } };

      await page.close();

    } catch (error) {
      yield {
        type: 'error',
        data: { message: error instanceof Error ? error.message : 'Analysis failed' },
      };
    } finally {
      await this.closeBrowser();
    }
  }

  // ============ BROWSER MANAGEMENT ============

  private async initBrowser(): Promise<void> {
    if (this.browser) return;

    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
  }

  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // ============ DATA CAPTURE ============

  private async captureWebsiteData(
    url: string,
    options: { includeScreenshots?: boolean }
  ): Promise<RawWebsiteData> {
    const page = await this.browser!.newPage();

    try {
      // Set desktop viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Navigate with performance metrics
      const startNav = Date.now();
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
      const loadTime = Date.now() - startNav;

      // Capture screenshots
      const screenshots: RawWebsiteData['screenshots'] = {};
      
      if (options.includeScreenshots !== false) {
        screenshots.desktop = await this.captureScreenshot(page, 'desktop');
        screenshots.mobile = await this.captureScreenshot(page, 'mobile');
        screenshots.fullPage = await this.captureFullPageScreenshot(page);
      }

      // Extract content
      const html = await page.content();
      const styles = await this.extractStyles(page);
      const scripts = await this.extractScripts(page);
      const metrics = await this.extractPerformanceMetrics(page);

      metrics.loadTime = loadTime;

      return {
        url,
        html,
        styles,
        scripts,
        screenshots,
        metrics,
      };

    } finally {
      await page.close();
    }
  }

  private async captureScreenshot(page: Page, viewport: 'desktop' | 'tablet' | 'mobile'): Promise<string> {
    const viewports = {
      desktop: { width: 1920, height: 1080 },
      tablet: { width: 768, height: 1024 },
      mobile: { width: 375, height: 812 },
    };

    await page.setViewport(viewports[viewport]);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for responsive adjustments

    const screenshot = await page.screenshot({
      encoding: 'base64',
      type: 'jpeg',
      quality: 80,
    });

    return screenshot as string;
  }

  private async captureFullPageScreenshot(page: Page): Promise<string> {
    const screenshot = await page.screenshot({
      encoding: 'base64',
      fullPage: true,
      type: 'jpeg',
      quality: 60,
    });

    return screenshot as string;
  }

  private async extractStyles(page: Page): Promise<string[]> {
    return page.evaluate(() => {
      const styles: string[] = [];

      // Inline styles
      document.querySelectorAll('style').forEach(style => {
        styles.push(style.textContent || '');
      });

      // External stylesheets (first 5)
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      links.slice(0, 5).forEach(link => {
        styles.push(`/* External: ${link.getAttribute('href')} */`);
      });

      // Computed styles of key elements
      const keyElements = document.querySelectorAll('h1, h2, p, a, button, nav, header, footer');
      keyElements.forEach(el => {
        const computed = window.getComputedStyle(el);
        styles.push(`/* ${el.tagName}: font-family: ${computed.fontFamily}; color: ${computed.color}; */`);
      });

      return styles;
    });
  }

  private async extractScripts(page: Page): Promise<string[]> {
    return page.evaluate(() => {
      const scripts: string[] = [];
      
      document.querySelectorAll('script[src]').forEach(script => {
        const src = script.getAttribute('src');
        if (src) scripts.push(src);
      });

      return scripts;
    });
  }

  private async extractPerformanceMetrics(page: Page): Promise<RawWebsiteData['metrics']> {
    const metrics = await page.evaluate(() => {
      const timing = performance.timing;
      const resources = performance.getEntriesByType('resource');

      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: 0,
        pageSize: resources.reduce((sum, r) => sum + (r as PerformanceResourceTiming).transferSize, 0),
        requests: resources.length,
      };
    });

    return metrics;
  }

  // ============ AI ANALYSIS ============

  private async analyzeWithVision(
    rawData: RawWebsiteData,
    options: { projectId: string; userId: string; organizationId: string }
  ): Promise<AnalysisOutput> {
    const content: LLMContent[] = [];

    // Add screenshot for visual analysis
    if (rawData.screenshots.desktop) {
      content.push({
        type: 'image',
        imageBase64: rawData.screenshots.desktop,
        mimeType: 'image/jpeg',
      });
    }

    // Add analysis prompt
    content.push({
      type: 'text',
      text: this.buildAnalysisPrompt(rawData),
    });

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: this.getSystemPrompt(),
      },
      {
        role: 'user',
        content,
      },
    ];

    const response = await this.llm.complete(this.config, messages, {
      ...options,
      cache: false,
    });

    return this.parseAnalysis(response.content, rawData);
  }

  private buildAnalysisPrompt(rawData: RawWebsiteData): string {
    return `Analyze this website screenshot and provide a comprehensive design analysis.

URL: ${rawData.url}

HTML Structure (excerpt):
${this.truncateHtml(rawData.html)}

CSS Styles Detected:
${rawData.styles.slice(0, 20).join('\n')}

Scripts Detected:
${rawData.scripts.slice(0, 10).join('\n')}

Performance Metrics:
- Load Time: ${rawData.metrics.loadTime}ms
- Page Size: ${(rawData.metrics.pageSize / 1024).toFixed(2)}KB
- Requests: ${rawData.metrics.requests}

Please analyze and provide:
1. Complete color palette with hex values and usage
2. Typography (fonts, sizes, weights)
3. Layout pattern and structure
4. UI components identified
5. Design style classification
6. Navigation pattern
7. SEO elements
8. Accessibility observations
9. Competitive insights (strengths, weaknesses, opportunities)

Respond with a detailed JSON following the AnalysisOutput schema.`;
  }

  private truncateHtml(html: string): string {
    // Extract key structural elements only
    const parser = new (require('node-html-parser').parse);
    // Simplified - just truncate
    return html.slice(0, 5000) + '...';
  }

  private getSystemPrompt(): string {
    return `You are Agent Sherlock, an expert web analyst specializing in:
1. Visual design analysis
2. Technology stack detection
3. UX pattern recognition
4. Performance evaluation
5. Competitive intelligence

You analyze websites comprehensively, extracting:
- Color palettes with precise hex values
- Typography families and hierarchy
- Layout patterns and grid systems
- Component libraries and design systems
- Technology stack (frameworks, libraries, CMS)
- Performance characteristics
- SEO implementation
- Accessibility compliance

Provide detailed, actionable insights in valid JSON format.`;
  }

  // ============ PARSING & VALIDATION ============

  private parseAnalysis(content: string, rawData: RawWebsiteData): AnalysisOutput {
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
      
      // Merge with raw data
      const enriched = {
        ...parsed,
        metadata: {
          ...parsed.metadata,
          url: rawData.url,
          analyzedAt: new Date().toISOString(),
        },
        screenshots: rawData.screenshots,
        performance: {
          ...parsed.performance,
          loadTime: rawData.metrics.loadTime,
          pageSize: rawData.metrics.pageSize,
          requests: rawData.metrics.requests,
        },
      };

      return AnalysisOutputSchema.parse(enriched);
    } catch (error) {
      // Return minimal valid output on parse failure
      return this.createFallbackAnalysis(rawData);
    }
  }

  private createFallbackAnalysis(rawData: RawWebsiteData): AnalysisOutput {
    return {
      metadata: {
        url: rawData.url,
        analyzedAt: new Date().toISOString(),
        duration: 0,
        confidence: 30,
      },
      screenshots: rawData.screenshots,
      technology: {
        libraries: [],
        analytics: [],
      },
      colorPalette: [],
      typography: {
        fonts: [],
        hierarchy: {},
      },
      layout: {
        pattern: 'grid',
        maxWidth: '1200px',
        columns: 12,
        gaps: ['16px'],
        sections: [],
      },
      components: [],
      designStyle: {
        overall: 'Modern',
        keywords: [],
        inspiration: [],
      },
      navigation: {
        type: 'horizontal',
        sticky: false,
        animated: false,
        items: 0,
      },
      content: {
        textContent: [],
        images: [],
        ctaButtons: [],
      },
      performance: {
        loadTime: rawData.metrics.loadTime,
        pageSize: rawData.metrics.pageSize,
        requests: rawData.metrics.requests,
      },
      seo: {
        title: '',
        description: '',
        keywords: [],
        ogTags: {},
      },
      accessibility: {
        score: 0,
        issues: [],
      },
      recommendations: [],
      competitiveInsights: {
        strengths: [],
        weaknesses: [],
        opportunities: [],
      },
    };
  }

  // ============ RECOMMENDATIONS ============

  private generateRecommendations(analysis: AnalysisOutput): AnalysisOutput['recommendations'] {
    const recommendations: AnalysisOutput['recommendations'] = [];

    // Performance recommendations
    if (analysis.performance.loadTime > 3000) {
      recommendations.push({
        category: 'performance',
        suggestion: 'Optimize page load time. Consider lazy loading images and deferring non-critical scripts.',
        priority: 'high',
        effort: 'medium',
      });
    }

    if (analysis.performance.pageSize > 3000000) {
      recommendations.push({
        category: 'performance',
        suggestion: 'Reduce page size by compressing images and minifying CSS/JS.',
        priority: 'high',
        effort: 'low',
      });
    }

    // Accessibility recommendations
    if (analysis.accessibility.score < 80) {
      recommendations.push({
        category: 'accessibility',
        suggestion: 'Improve accessibility score. Focus on color contrast, alt texts, and ARIA labels.',
        priority: 'high',
        effort: 'medium',
      });
    }

    // SEO recommendations
    if (!analysis.seo.description || analysis.seo.description.length < 120) {
      recommendations.push({
        category: 'seo',
        suggestion: 'Add or improve meta description. Aim for 150-160 characters.',
        priority: 'medium',
        effort: 'low',
      });
    }

    // Design recommendations
    if (analysis.colorPalette.length < 4) {
      recommendations.push({
        category: 'design',
        suggestion: 'Expand color palette with semantic colors (success, warning, error).',
        priority: 'low',
        effort: 'low',
      });
    }

    // Navigation recommendations
    if (analysis.navigation.items > 7) {
      recommendations.push({
        category: 'ux',
        suggestion: 'Consider simplifying navigation. Group items into mega menu or reduce count.',
        priority: 'medium',
        effort: 'medium',
      });
    }

    return recommendations;
  }

  // ============ UTILITY METHODS ============

  private validateUrl(url: string): string {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol');
      }
      return parsed.href;
    } catch {
      // Try adding https
      try {
        const withProtocol = new URL(`https://${url}`);
        return withProtocol.href;
      } catch {
        throw new ValidationError([{
          field: 'url',
          message: 'Invalid URL format',
        }]);
      }
    }
  }

  private calculateConfidence(analysis: AnalysisOutput): number {
    let score = 50;

    // Screenshots captured
    if (analysis.screenshots.desktop) score += 15;
    if (analysis.screenshots.mobile) score += 10;

    // Colors extracted
    if (analysis.colorPalette.length >= 5) score += 10;

    // Typography identified
    if (analysis.typography.fonts.length >= 2) score += 5;

    // Components identified
    if (analysis.components.length >= 5) score += 10;

    return Math.min(100, score);
  }

  // ============ CACHING ============

  private async getCachedAnalysis(url: string): Promise<{
    analysis: AnalysisOutput;
    rawData: RawWebsiteData;
  } | null> {
    const key = `sherlock:analysis:${this.hashUrl(url)}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  private async cacheAnalysis(
    url: string,
    data: { analysis: AnalysisOutput; rawData: RawWebsiteData }
  ): Promise<void> {
    const key = `sherlock:analysis:${this.hashUrl(url)}`;
    // Cache for 24 hours
    await this.redis.setex(key, 86400, JSON.stringify(data));
  }

  private hashUrl(url: string): string {
    return require('crypto').createHash('md5').update(url).digest('hex');
  }

  // ============ ERROR HANDLING ============

  private handleError(error: unknown): AppError {
    if (error instanceof AppError) return error;

    const message = error instanceof Error ? error.message : 'Analysis failed';

    if (message.includes('timeout') || message.includes('Navigation')) {
      return new AIError(
        ErrorCodes.TIMEOUT,
        'Website took too long to load. Please try again.',
        'Sherlock',
        this.config.model
      );
    }

    if (message.includes('net::ERR')) {
      return new AIError(
        ErrorCodes.EXTERNAL_SERVICE_ERROR,
        'Could not connect to the website. Please check the URL.',
        'Sherlock',
        this.config.model
      );
    }

    return new AIError(
      ErrorCodes.AI_ERROR,
      message,
      'Sherlock',
      this.config.model
    );
  }
}

// ============ RAW DATA INTERFACE ============

interface RawWebsiteData {
  url: string;
  html: string;
  styles: string[];
  scripts: string[];
  screenshots: {
    desktop?: string;
    tablet?: string;
    mobile?: string;
    fullPage?: string;
  };
  metrics: {
    loadTime: number;
    domContentLoaded?: number;
    firstPaint?: number;
    pageSize: number;
    requests: number;
  };
}

export default AgentSherlock;
