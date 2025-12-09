/**
 * Shared constants
 */

export const AGENT_NAMES = {
  DON: 'DON',
  MARK: 'MARK',
  JESSICA: 'JESSICA',
  SHERLOCK: 'SHERLOCK',
  ZARA: 'ZARA',
} as const;

export const SUBSCRIPTION_TIERS = {
  FREE: {
    maxProjects: 5,
    maxUsers: 3,
    maxStorage: 1073741824, // 1GB
    maxApiCalls: 1000,
  },
  PRO: {
    maxProjects: 50,
    maxUsers: 20,
    maxStorage: 10737418240, // 10GB
    maxApiCalls: 50000,
  },
  ENTERPRISE: {
    maxProjects: -1, // Unlimited
    maxUsers: -1,
    maxStorage: 107374182400, // 100GB
    maxApiCalls: -1,
  },
} as const;

export const TEMPLATE_CATEGORIES = [
  'All',
  'Fashion',
  'Technology',
  'Food & Restaurant',
  'Health & Fitness',
  'Travel',
  'Real Estate',
  'Education',
  'Entertainment',
  'Business',
  'E-commerce',
  'Portfolio',
  'Blog',
] as const;

export const THEME_GENERATION_METHODS = [
  'AI Prompt',
  'Website Clone',
  'Image Analysis',
  'HTML Extraction',
] as const;
