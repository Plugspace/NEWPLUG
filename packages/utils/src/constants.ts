// ==============================================
// PLUGSPACE.IO TITAN v1.4 - CONSTANTS
// ==============================================

// ============ APPLICATION ============

export const APP_NAME = 'Plugspace Titan';
export const APP_VERSION = '1.4.0';
export const APP_DESCRIPTION = 'Enterprise Voice-First AI Coding Platform';

// ============ ROUTES ============

export const ROUTES = {
  // Landing Page
  HOME: '/',
  TEMPLATES: '/templates',
  TEMPLATE_DETAIL: '/templates/:id',
  PRICING: '/pricing',
  ABOUT: '/about',
  CONTACT: '/contact',

  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  LOGOUT: '/logout',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',

  // Studio
  STUDIO: '/studio',
  STUDIO_PROJECT: '/studio/:projectId',
  STUDIO_SETTINGS: '/studio/settings',
  STUDIO_LIBRARY: '/studio/library',

  // Admin
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_PROJECTS: '/admin/projects',
  ADMIN_THEMES: '/admin/themes',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_SETTINGS: '/admin/settings',

  // API
  API_PREFIX: '/api/trpc',
} as const;

// ============ API ENDPOINTS ============

export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_VERIFY: '/auth/verify',

  // Users
  USERS: '/users',
  USER_PROFILE: '/users/profile',
  USER_SETTINGS: '/users/settings',

  // Projects
  PROJECTS: '/projects',
  PROJECT_PUBLISH: '/projects/:id/publish',
  PROJECT_CLONE: '/projects/:id/clone',

  // Templates
  TEMPLATES: '/templates',
  TEMPLATE_CATEGORIES: '/templates/categories',

  // Agents
  AGENT_DON: '/agents/don',
  AGENT_MARK: '/agents/mark',
  AGENT_JESSICA: '/agents/jessica',
  AGENT_SHERLOCK: '/agents/sherlock',
  AGENT_ZARA: '/agents/zara',

  // Voice
  VOICE_TRANSCRIBE: '/voice/transcribe',
  VOICE_SYNTHESIZE: '/voice/synthesize',

  // Admin
  ADMIN_STATS: '/admin/stats',
  ADMIN_USERS: '/admin/users',
  ADMIN_KILL_SWITCH: '/admin/kill-switch',
} as const;

// ============ SUBSCRIPTION TIERS ============

export const SUBSCRIPTION_TIERS = {
  FREE: {
    name: 'Free',
    price: 0,
    features: [
      '3 projects',
      '1 team member',
      '100MB storage',
      '100 AI requests/month',
      'Community support',
    ],
    limits: {
      maxProjects: 3,
      maxUsers: 1,
      maxStorage: 104857600, // 100MB
      maxApiCalls: 100,
      customDomain: false,
      prioritySupport: false,
      whiteLabel: false,
    },
  },
  PRO: {
    name: 'Pro',
    price: 29,
    features: [
      '25 projects',
      '5 team members',
      '5GB storage',
      '5,000 AI requests/month',
      'Custom domains',
      'Priority support',
    ],
    limits: {
      maxProjects: 25,
      maxUsers: 5,
      maxStorage: 5368709120, // 5GB
      maxApiCalls: 5000,
      customDomain: true,
      prioritySupport: true,
      whiteLabel: false,
    },
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 199,
    features: [
      'Unlimited projects',
      'Unlimited team members',
      '100GB storage',
      'Unlimited AI requests',
      'Custom domains',
      'Priority support',
      'White-label option',
      'SSO integration',
      'Dedicated account manager',
    ],
    limits: {
      maxProjects: 999999,
      maxUsers: 999999,
      maxStorage: 107374182400, // 100GB
      maxApiCalls: 999999,
      customDomain: true,
      prioritySupport: true,
      whiteLabel: true,
    },
  },
} as const;

// ============ TEMPLATE CATEGORIES ============

export const TEMPLATE_CATEGORIES = [
  { id: 'fashion', name: 'Fashion', icon: '👗' },
  { id: 'food', name: 'Food & Beverage', icon: '🍕' },
  { id: 'tech', name: 'Technology', icon: '💻' },
  { id: 'portfolio', name: 'Portfolio', icon: '🎨' },
  { id: 'ecommerce', name: 'E-commerce', icon: '🛒' },
  { id: 'blog', name: 'Blog', icon: '📝' },
  { id: 'agency', name: 'Agency', icon: '🏢' },
  { id: 'saas', name: 'SaaS', icon: '☁️' },
  { id: 'restaurant', name: 'Restaurant', icon: '🍽️' },
  { id: 'fitness', name: 'Fitness', icon: '💪' },
  { id: 'education', name: 'Education', icon: '📚' },
  { id: 'medical', name: 'Medical', icon: '🏥' },
] as const;

// ============ AI MODELS ============

export const AI_MODELS = {
  CLAUDE_SONNET: 'claude-sonnet-4-5-20241022',
  GEMINI_FLASH: 'gemini-2.0-flash-exp',
  GEMINI_PRO_VISION: 'gemini-pro-vision',
  IMAGEN_3: 'imagen-3',
} as const;

// ============ AGENT CONFIGURATIONS ============

export const AGENT_CONFIG = {
  DON: {
    name: 'Don',
    model: AI_MODELS.CLAUDE_SONNET,
    role: 'Project Architect',
    description: 'Designs project architecture, file structure, and tech stack',
    maxTokens: 4096,
    temperature: 0.7,
  },
  MARK: {
    name: 'Mark',
    model: AI_MODELS.CLAUDE_SONNET,
    role: 'Code Developer',
    description: 'Writes production-ready code based on architecture specs',
    maxTokens: 8192,
    temperature: 0.3,
  },
  JESSICA: {
    name: 'Jessica',
    model: AI_MODELS.CLAUDE_SONNET,
    role: 'Design Specialist',
    description: 'Creates design systems, color palettes, and UI components',
    maxTokens: 4096,
    temperature: 0.8,
  },
  SHERLOCK: {
    name: 'Sherlock',
    model: AI_MODELS.GEMINI_FLASH,
    role: 'Website Analyzer',
    description: 'Analyzes and clones existing websites',
    maxTokens: 4096,
    temperature: 0.5,
  },
  ZARA: {
    name: 'Zara',
    model: AI_MODELS.GEMINI_FLASH,
    role: 'Voice Assistant',
    description: 'Handles voice commands and natural language interactions',
    maxTokens: 2048,
    temperature: 0.6,
  },
} as const;

// ============ RATE LIMITS ============

export const RATE_LIMITS = {
  DEFAULT: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
  },
  AUTH: {
    maxRequests: 10,
    windowMs: 60000,
  },
  AI: {
    maxRequests: 20,
    windowMs: 60000,
  },
  UPLOAD: {
    maxRequests: 10,
    windowMs: 60000,
  },
} as const;

// ============ FILE UPLOAD ============

export const FILE_UPLOAD = {
  MAX_SIZE: 52428800, // 50MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_FILE_TYPES: [
    'application/pdf',
    'application/json',
    'text/html',
    'text/css',
    'text/javascript',
    'application/javascript',
  ],
  IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
} as const;

// ============ COLORS ============

export const COLORS = {
  PRIMARY: '#8b5cf6', // Purple
  SECONDARY: '#6366f1', // Indigo
  ACCENT: '#f59e0b', // Amber
  SUCCESS: '#10b981', // Emerald
  WARNING: '#f59e0b', // Amber
  ERROR: '#ef4444', // Red
  INFO: '#3b82f6', // Blue
  BACKGROUND: '#0a0a0a',
  SURFACE: '#1e293b',
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#94a3b8',
} as const;

// ============ BREAKPOINTS ============

export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

// ============ ANIMATION DURATIONS ============

export const ANIMATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// ============ CACHE TTL ============

export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
} as const;

// ============ MASTER ADMIN ============

export const MASTER_ADMIN_EMAIL = 'plugspaceapp@gmail.com';
