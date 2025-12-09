// ==============================================
// PLUGSPACE.IO TITAN v1.4 - VALIDATION UTILITIES
// ==============================================

import { z } from 'zod';

// ============ COMMON SCHEMAS ============

export const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must be less than 255 characters')
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  );

export const slugSchema = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(63, 'Slug must be less than 63 characters')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Slug must contain only lowercase letters, numbers, and hyphens'
  );

export const subdomainSchema = z
  .string()
  .min(3, 'Subdomain must be at least 3 characters')
  .max(63, 'Subdomain must be less than 63 characters')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Subdomain must contain only lowercase letters, numbers, and hyphens'
  )
  .refine(
    (val) => !['www', 'api', 'admin', 'app', 'cdn', 'mail', 'ftp'].includes(val),
    'This subdomain is reserved'
  );

export const domainSchema = z
  .string()
  .regex(
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/,
    'Invalid domain format'
  );

export const urlSchema = z
  .string()
  .url('Invalid URL')
  .refine(
    (val) => val.startsWith('http://') || val.startsWith('https://'),
    'URL must start with http:// or https://'
  );

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number');

export const uuidSchema = z.string().uuid('Invalid UUID');

export const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Invalid ObjectId');

// ============ PAGINATION SCHEMAS ============

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ============ SEARCH SCHEMAS ============

export const searchSchema = z.object({
  query: z.string().min(1).max(255).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
});

export type SearchInput = z.infer<typeof searchSchema>;

// ============ USER SCHEMAS ============

export const userCreateSchema = z.object({
  email: emailSchema,
  displayName: z.string().min(1).max(100).optional(),
  photoURL: urlSchema.optional(),
});

export const userUpdateSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: phoneSchema.optional(),
  bio: z.string().max(500).optional(),
  timezone: z.string().optional(),
  language: z.string().length(2).optional(),
});

// ============ PROJECT SCHEMAS ============

export const projectCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  subdomain: subdomainSchema,
  templateId: objectIdSchema.optional(),
});

export const projectUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  customDomain: domainSchema.optional().nullable(),
});

// ============ ORGANIZATION SCHEMAS ============

export const organizationCreateSchema = z.object({
  name: z.string().min(1).max(100),
  slug: slugSchema,
  billingEmail: emailSchema,
});

export const organizationUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logo: urlSchema.optional().nullable(),
  billingEmail: emailSchema.optional(),
});

// ============ THEME SCHEMAS ============

export const themeCreateSchema = z.object({
  name: z.string().min(1).max(100),
  method: z.enum(['AI Prompt', 'Website Clone', 'Image Analysis', 'HTML Extraction']),
  sourceUrl: urlSchema.optional(),
  colors: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).min(1).max(10),
  industry: z.string().optional(),
  style: z.string().optional(),
});

// ============ VOICE COMMAND SCHEMAS ============

export const voiceCommandSchema = z.object({
  transcript: z.string().min(1).max(5000),
  confidence: z.number().min(0).max(1),
  isFinal: z.boolean(),
});

// ============ CANVAS SCHEMAS ============

export const canvasComponentSchema: z.ZodType<{
  id: string;
  type: string;
  props: Record<string, unknown>;
  children?: unknown[];
  styles?: Record<string, string>;
}> = z.object({
  id: z.string(),
  type: z.string(),
  props: z.record(z.string(), z.unknown()),
  children: z.lazy(() => z.array(canvasComponentSchema)).optional(),
  styles: z.record(z.string(), z.string()).optional(),
});

// ============ PUBLISH SCHEMAS ============

export const publishConfigSchema = z.object({
  subdomain: subdomainSchema,
  customDomain: domainSchema.optional(),
  sslEnabled: z.boolean().default(true),
  cdnEnabled: z.boolean().default(true),
  seo: z
    .object({
      title: z.string().min(1).max(60),
      description: z.string().min(1).max(160),
      keywords: z.array(z.string()).max(10),
      ogImage: urlSchema.optional(),
    })
    .optional(),
});

// ============ VALIDATION HELPERS ============

export function validateOrThrow<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new Error(`Validation failed: ${errors}`);
  }
  return result.data;
}

export function validateSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
    };
  }
  return { success: true, data: result.data };
}

export function isValidEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export function isValidUrl(url: string): boolean {
  return urlSchema.safeParse(url).success;
}

export function isValidObjectId(id: string): boolean {
  return objectIdSchema.safeParse(id).success;
}
