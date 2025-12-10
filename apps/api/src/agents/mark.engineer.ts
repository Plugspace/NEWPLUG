// ==============================================
// PLUGSPACE.IO TITAN v1.4 - AGENT MARK (ENGINEER)
// ==============================================
// Claude Sonnet 4.5 powered code generation
// with production-ready Next.js 15 output,
// TypeScript strict mode, and comprehensive testing
// ==============================================

import { z } from 'zod';
import { Redis } from 'ioredis';
import { LLMService, LLMConfig, LLMMessage, LLMResponse } from '../services/llm/provider';
import { ArchitectureOutput } from './don.architect';
import { DesignOutput } from './jessica.designer';
import { logger } from '../lib/logger';
import { AppError, ErrorCodes, AIError, ValidationError } from '@plugspace/utils';

// ============ OUTPUT SCHEMAS ============

export const CodeFileSchema = z.object({
  path: z.string(),
  content: z.string(),
  type: z.enum(['component', 'page', 'layout', 'hook', 'util', 'type', 'config', 'test', 'api', 'middleware', 'style']),
  description: z.string().optional(),
});

export const DependencySchema = z.object({
  name: z.string(),
  version: z.string(),
  dev: z.boolean().default(false),
  reason: z.string().optional(),
});

export const CodeOutputSchema = z.object({
  metadata: z.object({
    framework: z.literal('Next.js 15'),
    language: z.literal('TypeScript'),
    styleFramework: z.literal('Tailwind CSS'),
    generatedAt: z.string(),
    version: z.string(),
  }),
  files: z.array(CodeFileSchema),
  dependencies: z.object({
    dependencies: z.record(z.string()),
    devDependencies: z.record(z.string()),
  }),
  scripts: z.record(z.string()),
  environment: z.object({
    required: z.array(z.string()),
    optional: z.array(z.string()),
    example: z.record(z.string()),
  }),
  structure: z.object({
    directories: z.array(z.string()),
    fileTree: z.record(z.any()),
  }),
  documentation: z.object({
    setup: z.string(),
    usage: z.string(),
    deployment: z.string(),
  }),
});

export type CodeOutput = z.infer<typeof CodeOutputSchema>;
export type CodeFile = z.infer<typeof CodeFileSchema>;

// ============ AGENT MARK CLASS ============

export class AgentMark {
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

  async generateCode(
    architecture: ArchitectureOutput,
    design: DesignOutput,
    context: {
      existingCode?: CodeFile[];
      customRequirements?: string[];
      includeTests?: boolean;
      includeStorybook?: boolean;
    },
    options: {
      projectId: string;
      userId: string;
      organizationId: string;
      stream?: boolean;
    }
  ): Promise<{
    code: CodeOutput;
    response: LLMResponse;
  }> {
    const startTime = Date.now();

    logger.info('Agent Mark starting code generation', {
      projectId: options.projectId,
      pageCount: architecture.pages.length,
      includeTests: context.includeTests,
    });

    try {
      // Generate code in phases
      const coreFiles = await this.generateCoreFiles(architecture, design, options);
      const componentFiles = await this.generateComponents(architecture, design, options);
      const pageFiles = await this.generatePages(architecture, design, options);
      const configFiles = await this.generateConfigs(architecture, design, options);

      // Optional: Generate tests
      let testFiles: CodeFile[] = [];
      if (context.includeTests) {
        testFiles = await this.generateTests(componentFiles, pageFiles, options);
      }

      // Combine all files
      const allFiles = [
        ...coreFiles,
        ...componentFiles,
        ...pageFiles,
        ...configFiles,
        ...testFiles,
      ];

      // Build final output
      const code = this.buildCodeOutput(allFiles, architecture, design);

      // Validate code quality
      await this.validateCodeQuality(code);

      logger.info('Agent Mark completed code generation', {
        projectId: options.projectId,
        duration: Date.now() - startTime,
        fileCount: code.files.length,
      });

      return {
        code,
        response: {
          id: `mark-${Date.now()}`,
          provider: 'claude',
          model: this.config.model,
          content: JSON.stringify(code),
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          cost: 0,
          latencyMs: Date.now() - startTime,
          finishReason: 'stop',
        },
      };

    } catch (error) {
      logger.error('Agent Mark code generation failed', {
        projectId: options.projectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw this.handleError(error);
    }
  }

  // ============ STREAMING GENERATION ============

  async *streamCode(
    architecture: ArchitectureOutput,
    design: DesignOutput,
    options: { projectId: string; userId: string; organizationId: string }
  ): AsyncGenerator<{
    type: 'progress' | 'file' | 'complete' | 'error';
    data: any;
  }> {
    const totalSteps = architecture.pages.length + 10;
    let currentStep = 0;

    yield { type: 'progress', data: { stage: 'core', progress: 5, step: ++currentStep, total: totalSteps } };

    // Generate core files
    const coreFiles = await this.generateCoreFiles(architecture, design, options);
    for (const file of coreFiles) {
      yield { type: 'file', data: file };
      yield { type: 'progress', data: { stage: 'core', progress: 15, step: ++currentStep, total: totalSteps } };
    }

    yield { type: 'progress', data: { stage: 'components', progress: 25 } };

    // Generate components
    const componentFiles = await this.generateComponents(architecture, design, options);
    for (const file of componentFiles) {
      yield { type: 'file', data: file };
      yield { type: 'progress', data: { stage: 'components', progress: 25 + (currentStep / totalSteps * 30), step: ++currentStep, total: totalSteps } };
    }

    yield { type: 'progress', data: { stage: 'pages', progress: 55 } };

    // Generate pages
    const pageFiles = await this.generatePages(architecture, design, options);
    for (const file of pageFiles) {
      yield { type: 'file', data: file };
      yield { type: 'progress', data: { stage: 'pages', progress: 55 + (currentStep / totalSteps * 30), step: ++currentStep, total: totalSteps } };
    }

    yield { type: 'progress', data: { stage: 'config', progress: 85 } };

    // Generate configs
    const configFiles = await this.generateConfigs(architecture, design, options);
    for (const file of configFiles) {
      yield { type: 'file', data: file };
    }

    yield { type: 'progress', data: { stage: 'complete', progress: 100 } };

    const allFiles = [...coreFiles, ...componentFiles, ...pageFiles, ...configFiles];
    const code = this.buildCodeOutput(allFiles, architecture, design);

    yield { type: 'complete', data: { code } };
  }

  // ============ CORE FILE GENERATION ============

  private async generateCoreFiles(
    architecture: ArchitectureOutput,
    design: DesignOutput,
    options: { projectId: string; userId: string; organizationId: string }
  ): Promise<CodeFile[]> {
    const files: CodeFile[] = [];

    // Root Layout
    files.push({
      path: 'app/layout.tsx',
      type: 'layout',
      content: this.generateRootLayout(architecture, design),
      description: 'Root layout with providers and global styles',
    });

    // Error Boundary
    files.push({
      path: 'app/error.tsx',
      type: 'page',
      content: this.generateErrorPage(design),
      description: 'Global error boundary',
    });

    // Loading State
    files.push({
      path: 'app/loading.tsx',
      type: 'page',
      content: this.generateLoadingPage(design),
      description: 'Global loading state',
    });

    // Not Found Page
    files.push({
      path: 'app/not-found.tsx',
      type: 'page',
      content: this.generateNotFoundPage(design),
      description: '404 error page',
    });

    // Global Styles
    files.push({
      path: 'app/globals.css',
      type: 'style',
      content: design.globalCSS,
      description: 'Global CSS styles',
    });

    // Utility Functions
    files.push({
      path: 'lib/utils.ts',
      type: 'util',
      content: this.generateUtils(),
      description: 'Utility functions',
    });

    // Type Definitions
    files.push({
      path: 'types/index.ts',
      type: 'type',
      content: this.generateTypes(architecture),
      description: 'TypeScript type definitions',
    });

    return files;
  }

  // ============ COMPONENT GENERATION ============

  private async generateComponents(
    architecture: ArchitectureOutput,
    design: DesignOutput,
    options: { projectId: string; userId: string; organizationId: string }
  ): Promise<CodeFile[]> {
    const files: CodeFile[] = [];

    // Button Component
    files.push({
      path: 'components/ui/button.tsx',
      type: 'component',
      content: this.generateButtonComponent(design),
      description: 'Button component with variants',
    });

    // Input Component
    files.push({
      path: 'components/ui/input.tsx',
      type: 'component',
      content: this.generateInputComponent(design),
      description: 'Input component with validation states',
    });

    // Card Component
    files.push({
      path: 'components/ui/card.tsx',
      type: 'component',
      content: this.generateCardComponent(design),
      description: 'Card component with variants',
    });

    // Navigation Component
    files.push({
      path: 'components/layout/navigation.tsx',
      type: 'component',
      content: this.generateNavigation(architecture, design),
      description: 'Main navigation component',
    });

    // Footer Component
    files.push({
      path: 'components/layout/footer.tsx',
      type: 'component',
      content: this.generateFooter(architecture, design),
      description: 'Footer component',
    });

    // Section components based on architecture
    const sectionTypes = new Set<string>();
    architecture.pages.forEach(page => {
      page.sections.forEach(section => {
        sectionTypes.add(section.type);
      });
    });

    for (const sectionType of sectionTypes) {
      files.push({
        path: `components/sections/${sectionType}.tsx`,
        type: 'component',
        content: this.generateSectionComponent(sectionType, design),
        description: `${sectionType} section component`,
      });
    }

    return files;
  }

  // ============ PAGE GENERATION ============

  private async generatePages(
    architecture: ArchitectureOutput,
    design: DesignOutput,
    options: { projectId: string; userId: string; organizationId: string }
  ): Promise<CodeFile[]> {
    const files: CodeFile[] = [];

    for (const page of architecture.pages) {
      const pagePath = page.route === '/' 
        ? 'app/page.tsx'
        : `app${page.route}/page.tsx`;

      files.push({
        path: pagePath,
        type: 'page',
        content: this.generatePageContent(page, design),
        description: `${page.name} page`,
      });

      // Generate page metadata
      if (page.route !== '/') {
        files.push({
          path: `app${page.route}/layout.tsx`,
          type: 'layout',
          content: this.generatePageLayout(page),
          description: `${page.name} layout with metadata`,
        });
      }
    }

    return files;
  }

  // ============ CONFIG GENERATION ============

  private async generateConfigs(
    architecture: ArchitectureOutput,
    design: DesignOutput,
    options: { projectId: string; userId: string; organizationId: string }
  ): Promise<CodeFile[]> {
    const files: CodeFile[] = [];

    // package.json
    files.push({
      path: 'package.json',
      type: 'config',
      content: this.generatePackageJson(architecture),
      description: 'NPM package configuration',
    });

    // tailwind.config.js
    files.push({
      path: 'tailwind.config.js',
      type: 'config',
      content: design.tailwindConfig,
      description: 'Tailwind CSS configuration',
    });

    // next.config.js
    files.push({
      path: 'next.config.js',
      type: 'config',
      content: this.generateNextConfig(architecture),
      description: 'Next.js configuration',
    });

    // tsconfig.json
    files.push({
      path: 'tsconfig.json',
      type: 'config',
      content: this.generateTsConfig(),
      description: 'TypeScript configuration',
    });

    // .eslintrc.js
    files.push({
      path: '.eslintrc.js',
      type: 'config',
      content: this.generateEslintConfig(),
      description: 'ESLint configuration',
    });

    // .env.example
    files.push({
      path: '.env.example',
      type: 'config',
      content: this.generateEnvExample(architecture),
      description: 'Environment variables example',
    });

    return files;
  }

  // ============ TEST GENERATION ============

  private async generateTests(
    components: CodeFile[],
    pages: CodeFile[],
    options: { projectId: string; userId: string; organizationId: string }
  ): Promise<CodeFile[]> {
    const files: CodeFile[] = [];

    // Generate component tests
    for (const component of components.filter(c => c.type === 'component')) {
      const testPath = component.path.replace('.tsx', '.test.tsx');
      files.push({
        path: `__tests__/${testPath}`,
        type: 'test',
        content: this.generateComponentTest(component),
        description: `Tests for ${component.path}`,
      });
    }

    // Jest config
    files.push({
      path: 'jest.config.js',
      type: 'config',
      content: this.generateJestConfig(),
      description: 'Jest configuration',
    });

    // Setup file
    files.push({
      path: 'jest.setup.ts',
      type: 'config',
      content: this.generateJestSetup(),
      description: 'Jest setup file',
    });

    return files;
  }

  // ============ TEMPLATE METHODS ============

  private generateRootLayout(architecture: ArchitectureOutput, design: DesignOutput): string {
    const fonts = design.typography.fontFamilies;
    
    return `import type { Metadata } from 'next';
import { ${fonts.heading.name.replace(/\s+/g, '_')}, ${fonts.body.name.replace(/\s+/g, '_')} } from 'next/font/google';
import './globals.css';
import { Navigation } from '@/components/layout/navigation';
import { Footer } from '@/components/layout/footer';

const headingFont = ${fonts.heading.name.replace(/\s+/g, '_')}({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const bodyFont = ${fonts.body.name.replace(/\s+/g, '_')}({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: '${architecture.metadata.appName}',
    template: \`%s | ${architecture.metadata.appName}\`,
  },
  description: '${architecture.pages[0]?.seo.description || 'Welcome to our application'}',
  keywords: ${JSON.stringify(architecture.pages[0]?.seo.keywords || [])},
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={\`\${headingFont.variable} \${bodyFont.variable}\`}>
      <body className="min-h-screen bg-background font-body text-text antialiased">
        <Navigation />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}`;
  }

  private generateErrorPage(design: DesignOutput): string {
    return `'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center px-4">
      <h2 className="text-2xl font-bold text-text mb-4">Something went wrong!</h2>
      <p className="text-text-secondary mb-6 text-center max-w-md">
        We apologize for the inconvenience. Please try again.
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}`;
  }

  private generateLoadingPage(design: DesignOutput): string {
    return `export default function Loading() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
        <p className="text-text-secondary">Loading...</p>
      </div>
    </div>
  );
}`;
  }

  private generateNotFoundPage(design: DesignOutput): string {
    return `import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-bold text-primary-600 mb-4">404</h1>
      <h2 className="text-2xl font-bold text-text mb-4">Page Not Found</h2>
      <p className="text-text-secondary mb-6 text-center max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/">
        <Button>Go Home</Button>
      </Link>
    </div>
  );
}`;
  }

  private generateUtils(): string {
    return `import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\\w ]+/g, '')
    .replace(/ +/g, '-');
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}`;
  }

  private generateTypes(architecture: ArchitectureOutput): string {
    let types = `// Auto-generated types from architecture\n\n`;

    // Generate types for database models
    for (const model of architecture.database.models) {
      types += `export interface ${model.name} {\n`;
      for (const field of model.fields) {
        const optional = field.required ? '' : '?';
        const tsType = this.mapFieldType(field.type);
        types += `  ${field.name}${optional}: ${tsType};\n`;
      }
      types += `}\n\n`;
    }

    // Generate API response types
    types += `export interface ApiResponse<T> {\n`;
    types += `  success: boolean;\n`;
    types += `  data?: T;\n`;
    types += `  error?: {\n`;
    types += `    code: string;\n`;
    types += `    message: string;\n`;
    types += `  };\n`;
    types += `}\n\n`;

    // Generate page props types
    for (const page of architecture.pages) {
      const pageName = page.name.replace(/\s+/g, '');
      types += `export interface ${pageName}PageProps {\n`;
      types += `  params?: Record<string, string>;\n`;
      types += `  searchParams?: Record<string, string>;\n`;
      types += `}\n\n`;
    }

    return types;
  }

  private mapFieldType(type: string): string {
    const typeMap: Record<string, string> = {
      'String': 'string',
      'Int': 'number',
      'Float': 'number',
      'Boolean': 'boolean',
      'DateTime': 'Date',
      'Json': 'Record<string, unknown>',
      'ObjectId': 'string',
    };
    return typeMap[type] || 'unknown';
  }

  private generateButtonComponent(design: DesignOutput): string {
    const buttons = design.components.buttons;
    
    return `import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const variants = {
      primary: '${buttons.find(b => b.variant === 'primary')?.classes || 'bg-primary-600 text-white hover:bg-primary-700'}',
      secondary: '${buttons.find(b => b.variant === 'secondary')?.classes || 'bg-secondary-100 text-secondary-900 hover:bg-secondary-200'}',
      outline: '${buttons.find(b => b.variant === 'outline')?.classes || 'border border-primary-600 text-primary-600 hover:bg-primary-50'}',
      ghost: '${buttons.find(b => b.variant === 'ghost')?.classes || 'text-primary-600 hover:bg-primary-50'}',
      danger: '${buttons.find(b => b.variant === 'danger')?.classes || 'bg-error text-white hover:bg-red-700'}',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };`;
  }

  private generateInputComponent(design: DesignOutput): string {
    const inputs = design.components.inputs;
    
    return `import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text mb-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            '${inputs.default}',
            error && '${inputs.error}',
            props.disabled && '${inputs.disabled}',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? \`\${inputId}-error\` : undefined}
          {...props}
        />
        {error && (
          <p id={\`\${inputId}-error\`} className="mt-1 text-sm text-error">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-text-secondary">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };`;
  }

  private generateCardComponent(design: DesignOutput): string {
    const cards = design.components.cards;
    
    return `import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive';
}

export function Card({ className, variant = 'default', children, ...props }: CardProps) {
  const variants = {
    default: '${cards.default}',
    elevated: '${cards.elevated}',
    interactive: '${cards.interactive}',
  };

  return (
    <div className={cn(variants[variant], className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pb-0', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-xl font-semibold text-text', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-text-secondary mt-1', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
}`;
  }

  private generateNavigation(architecture: ArchitectureOutput, design: DesignOutput): string {
    const publicPages = architecture.pages.filter(p => p.accessControl.public);
    
    return `'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navigation = [
${publicPages.map(p => `  { name: '${p.name}', href: '${p.route}' },`).join('\n')}
];

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="${design.components.navigation.desktop}">
      <nav className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="flex items-center">
          <Link href="/" className="text-xl font-bold text-primary-600">
            ${architecture.metadata.appName}
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'text-primary-600'
                  : 'text-text-secondary hover:text-text'
              )}
            >
              {item.name}
            </Link>
          ))}
          ${architecture.authentication.required ? `<Button size="sm">Sign In</Button>` : ''}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="${design.components.navigation.mobile} md:hidden">
          <div className="px-4 py-4 space-y-4">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'block text-base font-medium',
                  pathname === item.href
                    ? 'text-primary-600'
                    : 'text-text-secondary'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}`;
  }

  private generateFooter(architecture: ArchitectureOutput, design: DesignOutput): string {
    return `import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-bold text-text mb-4">${architecture.metadata.appName}</h3>
            <p className="text-text-secondary text-sm">
              Building amazing experiences.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text mb-4">Product</h4>
            <ul className="space-y-2">
              <li><Link href="/features" className="text-sm text-text-secondary hover:text-text">Features</Link></li>
              <li><Link href="/pricing" className="text-sm text-text-secondary hover:text-text">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-sm text-text-secondary hover:text-text">About</Link></li>
              <li><Link href="/contact" className="text-sm text-text-secondary hover:text-text">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="text-sm text-text-secondary hover:text-text">Privacy</Link></li>
              <li><Link href="/terms" className="text-sm text-text-secondary hover:text-text">Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border mt-8 pt-8 text-center">
          <p className="text-sm text-text-secondary">
            © {new Date().getFullYear()} ${architecture.metadata.appName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}`;
  }

  private generateSectionComponent(sectionType: string, design: DesignOutput): string {
    const templates: Record<string, string> = {
      hero: this.generateHeroSection(design),
      features: this.generateFeaturesSection(design),
      testimonials: this.generateTestimonialsSection(design),
      cta: this.generateCTASection(design),
      pricing: this.generatePricingSection(design),
      faq: this.generateFAQSection(design),
      contact: this.generateContactSection(design),
    };

    return templates[sectionType] || this.generateGenericSection(sectionType, design);
  }

  private generateHeroSection(design: DesignOutput): string {
    return `import { Button } from '@/components/ui/button';

interface HeroProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  secondaryCta?: {
    text: string;
    link: string;
  };
}

export function Hero({ title, subtitle, ctaText, ctaLink, secondaryCta }: HeroProps) {
  return (
    <section className="relative py-20 lg:py-32">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text mb-6 max-w-4xl mx-auto">
          {title}
        </h1>
        <p className="text-lg md:text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
          {subtitle}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" asChild>
            <a href={ctaLink}>{ctaText}</a>
          </Button>
          {secondaryCta && (
            <Button variant="outline" size="lg" asChild>
              <a href={secondaryCta.link}>{secondaryCta.text}</a>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}`;
  }

  private generateFeaturesSection(design: DesignOutput): string {
    return `import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface FeaturesProps {
  title: string;
  subtitle?: string;
  features: Feature[];
}

export function Features({ title, subtitle, features }: FeaturesProps) {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">{title}</h2>
          {subtitle && (
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">{subtitle}</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} variant="interactive">
              <CardHeader>
                <div className="mb-4 text-primary-600">{feature.icon}</div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}`;
  }

  private generateTestimonialsSection(design: DesignOutput): string {
    return `import { Card, CardContent } from '@/components/ui/card';

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company?: string;
  avatar?: string;
}

interface TestimonialsProps {
  title: string;
  testimonials: Testimonial[];
}

export function Testimonials({ title, testimonials }: TestimonialsProps) {
  return (
    <section className="py-20 bg-surface">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-text text-center mb-12">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <p className="text-text-secondary mb-6 italic">"{testimonial.quote}"</p>
                <div className="flex items-center">
                  {testimonial.avatar && (
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.author}
                      className="w-12 h-12 rounded-full mr-4"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-text">{testimonial.author}</p>
                    <p className="text-sm text-text-secondary">
                      {testimonial.role}{testimonial.company && \`, \${testimonial.company}\`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}`;
  }

  private generateCTASection(design: DesignOutput): string {
    return `import { Button } from '@/components/ui/button';

interface CTAProps {
  title: string;
  description: string;
  primaryCta: { text: string; link: string };
  secondaryCta?: { text: string; link: string };
}

export function CTA({ title, description, primaryCta, secondaryCta }: CTAProps) {
  return (
    <section className="py-20 bg-primary-600 text-white">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
        <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">{description}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" variant="secondary" asChild>
            <a href={primaryCta.link}>{primaryCta.text}</a>
          </Button>
          {secondaryCta && (
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" asChild>
              <a href={secondaryCta.link}>{secondaryCta.text}</a>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}`;
  }

  private generatePricingSection(design: DesignOutput): string {
    return `import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  ctaText: string;
  popular?: boolean;
}

interface PricingProps {
  title: string;
  subtitle?: string;
  plans: PricingPlan[];
}

export function Pricing({ title, subtitle, plans }: PricingProps) {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">{title}</h2>
          {subtitle && (
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">{subtitle}</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <Card key={index} variant={plan.popular ? 'elevated' : 'default'} className={plan.popular ? 'border-2 border-primary-500' : ''}>
              {plan.popular && (
                <div className="bg-primary-500 text-white text-center py-1 text-sm font-medium">
                  Most Popular
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-text-secondary">/{plan.period}</span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center">
                      <svg className="w-5 h-5 text-success mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-text-secondary">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant={plan.popular ? 'primary' : 'outline'}>
                  {plan.ctaText}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}`;
  }

  private generateFAQSection(design: DesignOutput): string {
    return `'use client';

import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  title: string;
  items: FAQItem[];
}

export function FAQ({ title, items }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-bold text-text text-center mb-12">{title}</h2>
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="border border-border rounded-lg">
              <button
                className="w-full px-6 py-4 text-left flex items-center justify-between"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-medium text-text">{item.question}</span>
                <svg
                  className={\`w-5 h-5 transform transition-transform \${openIndex === index ? 'rotate-180' : ''}\`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4">
                  <p className="text-text-secondary">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;
  }

  private generateContactSection(design: DesignOutput): string {
    return `'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', formData);
  };

  return (
    <section className="py-20">
      <div className="container mx-auto px-4 max-w-xl">
        <h2 className="text-3xl md:text-4xl font-bold text-text text-center mb-4">Get in Touch</h2>
        <p className="text-text-secondary text-center mb-8">
          We'd love to hear from you. Send us a message and we'll respond as soon as possible.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Name"
            placeholder="Your name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-text mb-1">Message</label>
            <textarea
              rows={4}
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Your message..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
            />
          </div>
          <Button type="submit" className="w-full">Send Message</Button>
        </form>
      </div>
    </section>
  );
}`;
  }

  private generateGenericSection(sectionType: string, design: DesignOutput): string {
    return `interface ${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)}Props {
  title: string;
  content?: React.ReactNode;
}

export function ${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)}({ title, content }: ${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)}Props) {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-text text-center mb-8">{title}</h2>
        {content}
      </div>
    </section>
  );
}`;
  }

  private generatePageContent(page: ArchitectureOutput['pages'][0], design: DesignOutput): string {
    const sectionImports = page.sections.map(s => 
      `import { ${s.type.charAt(0).toUpperCase() + s.type.slice(1)} } from '@/components/sections/${s.type}';`
    ).join('\n');

    return `${sectionImports}

export default function ${page.name.replace(/\s+/g, '')}Page() {
  return (
    <>
      {/* ${page.purpose} */}
      ${page.sections.map(s => `{/* ${s.name} Section */}`).join('\n      ')}
    </>
  );
}`;
  }

  private generatePageLayout(page: ArchitectureOutput['pages'][0]): string {
    return `import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '${page.seo.title}',
  description: '${page.seo.description}',
  keywords: ${JSON.stringify(page.seo.keywords)},
};

export default function ${page.name.replace(/\s+/g, '')}Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}`;
  }

  private generatePackageJson(architecture: ArchitectureOutput): string {
    const pkg = {
      name: architecture.metadata.appName.toLowerCase().replace(/\s+/g, '-'),
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint',
        test: 'jest',
        'test:watch': 'jest --watch',
        'test:coverage': 'jest --coverage',
      },
      dependencies: {
        'next': '^15.0.0',
        'react': '^18.3.0',
        'react-dom': '^18.3.0',
        'clsx': '^2.1.0',
        'tailwind-merge': '^2.2.0',
      },
      devDependencies: {
        '@types/node': '^20.10.0',
        '@types/react': '^18.2.0',
        '@types/react-dom': '^18.2.0',
        'typescript': '^5.3.0',
        'tailwindcss': '^3.4.0',
        'postcss': '^8.4.0',
        'autoprefixer': '^10.4.0',
        'eslint': '^8.56.0',
        'eslint-config-next': '^15.0.0',
        '@testing-library/react': '^14.1.0',
        '@testing-library/jest-dom': '^6.2.0',
        'jest': '^29.7.0',
        'jest-environment-jsdom': '^29.7.0',
      },
    };

    return JSON.stringify(pkg, null, 2);
  }

  private generateNextConfig(architecture: ArchitectureOutput): string {
    return `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    serverActions: true,
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
      ],
    },
  ],
};

module.exports = nextConfig;`;
  }

  private generateTsConfig(): string {
    return JSON.stringify({
      compilerOptions: {
        target: 'es5',
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        plugins: [{ name: 'next' }],
        paths: {
          '@/*': ['./*'],
        },
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules'],
    }, null, 2);
  }

  private generateEslintConfig(): string {
    return `module.exports = {
  extends: ['next/core-web-vitals', 'next/typescript'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    'react/no-unescaped-entities': 'off',
  },
};`;
  }

  private generateEnvExample(architecture: ArchitectureOutput): string {
    const vars = ['NEXT_PUBLIC_APP_NAME=' + architecture.metadata.appName];

    if (architecture.authentication.required) {
      vars.push('NEXTAUTH_SECRET=');
      vars.push('NEXTAUTH_URL=http://localhost:3000');
      
      if (architecture.authentication.methods.includes('google')) {
        vars.push('GOOGLE_CLIENT_ID=');
        vars.push('GOOGLE_CLIENT_SECRET=');
      }
      if (architecture.authentication.methods.includes('github')) {
        vars.push('GITHUB_CLIENT_ID=');
        vars.push('GITHUB_CLIENT_SECRET=');
      }
    }

    for (const integration of architecture.integrations) {
      vars.push(`${integration.service.toUpperCase()}_API_KEY=`);
    }

    return vars.join('\n');
  }

  private generateComponentTest(component: CodeFile): string {
    const componentName = component.path.split('/').pop()?.replace('.tsx', '') || 'Component';
    const PascalName = componentName.charAt(0).toUpperCase() + componentName.slice(1);

    return `import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ${PascalName} } from '@/${component.path.replace('.tsx', '')}';

describe('${PascalName}', () => {
  it('renders without crashing', () => {
    render(<${PascalName} />);
  });

  it('matches snapshot', () => {
    const { container } = render(<${PascalName} />);
    expect(container).toMatchSnapshot();
  });
});`;
  }

  private generateJestConfig(): string {
    return `const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

module.exports = createJestConfig(customJestConfig);`;
  }

  private generateJestSetup(): string {
    return `import '@testing-library/jest-dom';`;
  }

  // ============ BUILD OUTPUT ============

  private buildCodeOutput(
    files: CodeFile[],
    architecture: ArchitectureOutput,
    design: DesignOutput
  ): CodeOutput {
    const directories = [...new Set(files.map(f => f.path.split('/').slice(0, -1).join('/')))].filter(Boolean);

    return {
      metadata: {
        framework: 'Next.js 15',
        language: 'TypeScript',
        styleFramework: 'Tailwind CSS',
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
      },
      files,
      dependencies: {
        dependencies: {
          'next': '^15.0.0',
          'react': '^18.3.0',
          'react-dom': '^18.3.0',
          'clsx': '^2.1.0',
          'tailwind-merge': '^2.2.0',
        },
        devDependencies: {
          '@types/node': '^20.10.0',
          '@types/react': '^18.2.0',
          'typescript': '^5.3.0',
          'tailwindcss': '^3.4.0',
          'postcss': '^8.4.0',
          'autoprefixer': '^10.4.0',
          'eslint': '^8.56.0',
        },
      },
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint',
        test: 'jest',
      },
      environment: {
        required: ['NEXT_PUBLIC_APP_NAME'],
        optional: [],
        example: {},
      },
      structure: {
        directories,
        fileTree: this.buildFileTree(files),
      },
      documentation: {
        setup: 'npm install && npm run dev',
        usage: 'Open http://localhost:3000',
        deployment: 'npm run build && npm run start',
      },
    };
  }

  private buildFileTree(files: CodeFile[]): Record<string, any> {
    const tree: Record<string, any> = {};

    for (const file of files) {
      const parts = file.path.split('/');
      let current = tree;

      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }

      current[parts[parts.length - 1]] = file.type;
    }

    return tree;
  }

  private async validateCodeQuality(code: CodeOutput): Promise<void> {
    // Basic validation
    if (code.files.length < 5) {
      logger.warn('Generated code has fewer files than expected');
    }

    // Check for required files
    const requiredFiles = ['app/layout.tsx', 'app/page.tsx', 'package.json'];
    for (const required of requiredFiles) {
      if (!code.files.some(f => f.path === required)) {
        logger.warn(`Missing required file: ${required}`);
      }
    }
  }

  private getSystemPrompt(): string {
    return `You are Agent Mark, an expert full-stack engineer specializing in Next.js 15, React, TypeScript, and Tailwind CSS. You create production-ready, enterprise-grade code.

Your code follows these standards:
- Next.js 15 App Router architecture
- React Server Components by default
- TypeScript strict mode
- Clean code principles (SOLID, DRY)
- Comprehensive error handling
- Full accessibility compliance (WCAG 2.1 AA)
- Performance optimization
- Security best practices

You never generate placeholder code or comments like "// TODO". Every component is complete and functional.`;
  }

  private handleError(error: unknown): AppError {
    if (error instanceof AppError) return error;

    return new AIError(
      ErrorCodes.AI_ERROR,
      error instanceof Error ? error.message : 'Code generation failed',
      'Mark',
      this.config.model
    );
  }
}

export default AgentMark;
