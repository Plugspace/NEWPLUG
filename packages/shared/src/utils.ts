/**
 * Shared utility functions
 */

/**
 * Generate a unique subdomain
 */
export function generateSubdomain(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Validate subdomain format
 */
export function isValidSubdomain(subdomain: string): boolean {
  return /^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$/.test(subdomain);
}

/**
 * Calculate token cost (approximate)
 */
export function calculateTokenCost(tokens: number, model: string): number {
  // Pricing per 1M tokens (approximate)
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-sonnet-4-5-20241022': { input: 3.0, output: 15.0 },
    'gemini-2.0-flash-exp': { input: 0.075, output: 0.30 },
  };

  const modelPricing = pricing[model] || { input: 1.0, output: 3.0 };
  // Assume 80% input, 20% output
  const inputTokens = tokens * 0.8;
  const outputTokens = tokens * 0.2;

  return (
    (inputTokens / 1_000_000) * modelPricing.input +
    (outputTokens / 1_000_000) * modelPricing.output
  );
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
