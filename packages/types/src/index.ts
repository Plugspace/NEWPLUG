// ==============================================
// PLUGSPACE.IO TITAN v1.4 - TYPE DEFINITIONS
// ==============================================

// ============ ENUMS ============

export enum Role {
  USER = 'USER',
  STUDIO_ADMIN = 'STUDIO_ADMIN',
  MASTER_ADMIN = 'MASTER_ADMIN',
}

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum AgentName {
  DON = 'DON',
  MARK = 'MARK',
  JESSICA = 'JESSICA',
  SHERLOCK = 'SHERLOCK',
  ZARA = 'ZARA',
}

export enum SubscriptionTier {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum TemplateCategory {
  FASHION = 'fashion',
  FOOD = 'food',
  TECH = 'tech',
  PORTFOLIO = 'portfolio',
  ECOMMERCE = 'ecommerce',
  BLOG = 'blog',
  AGENCY = 'agency',
  SAAS = 'saas',
  RESTAURANT = 'restaurant',
  FITNESS = 'fitness',
  EDUCATION = 'education',
  MEDICAL = 'medical',
}

// ============ USER TYPES ============

export interface User {
  id: string;
  firebaseUid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: Role;
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  timezone: string;
  language: string;
  mfaEnabled: boolean;
  lastLoginAt?: Date;
  lastLoginIP?: string;
  loginAttempts: number;
  lockedUntil?: Date;
  organizationId: string;
  stripeCustomerId?: string;
  subscriptionTier: SubscriptionTier;
  creditsRemaining: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface UserCreateInput {
  firebaseUid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  organizationId: string;
}

export interface UserUpdateInput {
  displayName?: string;
  photoURL?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  timezone?: string;
  language?: string;
}

// ============ ORGANIZATION TYPES ============

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo?: string;
  tier: SubscriptionTier;
  billingEmail: string;
  stripeSubscriptionId?: string;
  maxProjects: number;
  maxUsers: number;
  maxStorage: number;
  maxApiCalls: number;
  currentProjects: number;
  currentUsers: number;
  currentStorage: number;
  apiCallsThisMonth: number;
  allowedDomains: string[];
  ssoEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationCreateInput {
  name: string;
  slug: string;
  billingEmail: string;
}

// ============ PROJECT TYPES ============

export interface Project {
  id: string;
  name: string;
  description?: string;
  subdomain: string;
  customDomain?: string;
  userId: string;
  organizationId: string;
  status: ProjectStatus;
  isPublished: boolean;
  publishedAt?: Date;
  architecture?: ArchitectureOutput;
  design?: DesignOutput;
  codeFiles?: Record<string, string>;
  dependencies?: Record<string, string>;
  clonedFrom?: string;
  cloneAnalysis?: CloneAnalysis;
  deploymentUrl?: string;
  sslEnabled: boolean;
  cdnEnabled: boolean;
  version: number;
  previousVersions: ProjectVersion[];
  views: number;
  lastViewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface ProjectCreateInput {
  name: string;
  description?: string;
  subdomain: string;
  templateId?: string;
}

export interface ProjectUpdateInput {
  name?: string;
  description?: string;
  customDomain?: string;
  status?: ProjectStatus;
}

export interface ProjectVersion {
  version: number;
  timestamp: Date;
  changes: string;
  codeSnapshot: Record<string, string>;
}

// ============ AGENT OUTPUT TYPES ============

export interface ArchitectureOutput {
  projectStructure: {
    directories: string[];
    files: FileDefinition[];
  };
  techStack: {
    frontend: string[];
    backend: string[];
    database: string[];
    services: string[];
  };
  routes: RouteDefinition[];
  components: ComponentDefinition[];
  dataModels: DataModelDefinition[];
  apiEndpoints: ApiEndpointDefinition[];
}

export interface FileDefinition {
  path: string;
  type: 'component' | 'page' | 'api' | 'config' | 'style' | 'util' | 'hook' | 'type';
  description: string;
}

export interface RouteDefinition {
  path: string;
  component: string;
  layout?: string;
  protected: boolean;
  metadata?: {
    title: string;
    description: string;
  };
}

export interface ComponentDefinition {
  name: string;
  type: 'ui' | 'layout' | 'feature' | 'page';
  props: PropDefinition[];
  dependencies: string[];
}

export interface PropDefinition {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description: string;
}

export interface DataModelDefinition {
  name: string;
  fields: FieldDefinition[];
  relations: RelationDefinition[];
}

export interface FieldDefinition {
  name: string;
  type: string;
  required: boolean;
  unique: boolean;
  index: boolean;
}

export interface RelationDefinition {
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  target: string;
  field: string;
}

export interface ApiEndpointDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  handler: string;
  auth: boolean;
  rateLimit?: number;
}

// ============ DESIGN OUTPUT TYPES ============

export interface DesignOutput {
  colorPalette: ColorPalette;
  typography: Typography;
  spacing: SpacingSystem;
  components: UIComponentStyles;
  animations: AnimationDefinitions;
  breakpoints: BreakpointDefinitions;
}

export interface ColorPalette {
  primary: ColorScale;
  secondary: ColorScale;
  accent: ColorScale;
  neutral: ColorScale;
  success: string;
  warning: string;
  error: string;
  info: string;
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };
}

export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface Typography {
  fontFamily: {
    heading: string;
    body: string;
    mono: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
    '5xl': string;
  };
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: string;
    normal: string;
    relaxed: string;
  };
}

export interface SpacingSystem {
  unit: number;
  scale: Record<string, string>;
}

export interface UIComponentStyles {
  button: ButtonStyles;
  input: InputStyles;
  card: CardStyles;
  modal: ModalStyles;
  navigation: NavigationStyles;
}

export interface ButtonStyles {
  borderRadius: string;
  padding: {
    sm: string;
    md: string;
    lg: string;
  };
  variants: {
    primary: Record<string, string>;
    secondary: Record<string, string>;
    outline: Record<string, string>;
    ghost: Record<string, string>;
  };
}

export interface InputStyles {
  borderRadius: string;
  borderColor: string;
  focusColor: string;
  padding: string;
}

export interface CardStyles {
  borderRadius: string;
  shadow: string;
  padding: string;
  background: string;
}

export interface ModalStyles {
  borderRadius: string;
  shadow: string;
  overlay: string;
  maxWidth: Record<string, string>;
}

export interface NavigationStyles {
  height: string;
  background: string;
  shadow: string;
  linkColor: string;
  linkHoverColor: string;
}

export interface AnimationDefinitions {
  duration: {
    fast: string;
    normal: string;
    slow: string;
  };
  easing: {
    default: string;
    in: string;
    out: string;
    inOut: string;
  };
  keyframes: Record<string, Record<string, Record<string, string>>>;
}

export interface BreakpointDefinitions {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

// ============ CLONE ANALYSIS TYPES ============

export interface CloneAnalysis {
  url: string;
  scrapedAt: Date;
  pages: PageAnalysis[];
  assets: AssetAnalysis[];
  styles: StyleAnalysis;
  structure: StructureAnalysis;
}

export interface PageAnalysis {
  url: string;
  title: string;
  description?: string;
  html: string;
  screenshot?: string;
}

export interface AssetAnalysis {
  type: 'image' | 'font' | 'icon' | 'video';
  url: string;
  localPath?: string;
}

export interface StyleAnalysis {
  colors: string[];
  fonts: string[];
  spacing: string[];
  shadows: string[];
}

export interface StructureAnalysis {
  navigation: NavigationElement[];
  sections: SectionElement[];
  footer: FooterElement;
}

export interface NavigationElement {
  type: 'link' | 'dropdown' | 'button';
  text: string;
  href?: string;
  children?: NavigationElement[];
}

export interface SectionElement {
  type: string;
  id?: string;
  classes: string[];
  content: string;
}

export interface FooterElement {
  columns: FooterColumn[];
  copyright?: string;
  social?: SocialLink[];
}

export interface FooterColumn {
  title: string;
  links: { text: string; href: string }[];
}

export interface SocialLink {
  platform: string;
  url: string;
  icon: string;
}

// ============ INTERACTION LOG TYPES ============

export interface InteractionLog {
  id: string;
  projectId: string;
  userId: string;
  agentName: AgentName;
  agentModel: string;
  input: string;
  output: Record<string, unknown>;
  tokensUsed: number;
  latencyMs: number;
  cost: number;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
}

// ============ TEMPLATE TYPES ============

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  type: string;
  templateData: TemplateData;
  featured: boolean;
  downloads: number;
  rating: number;
  reviews: number;
  previewImage?: string;
  thumbnailImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateData {
  nav?: NavConfig;
  hero?: HeroConfig;
  products?: ProductConfig[];
  colors?: ThemeColors;
  sections?: SectionConfig[];
}

export interface NavConfig {
  logo: string;
  links: { text: string; href: string }[];
  cta?: { text: string; href: string };
}

export interface HeroConfig {
  headline: string;
  subheadline?: string;
  image?: string;
  cta: { text: string; href: string };
}

export interface ProductConfig {
  name: string;
  price: number;
  image: string;
  description?: string;
  category?: string;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface SectionConfig {
  type: string;
  title?: string;
  content: Record<string, unknown>;
}

// ============ THEME TYPES ============

export interface Theme {
  id: string;
  name: string;
  organizationId: string;
  method: ThemeGenerationMethod;
  sourceUrl?: string;
  sourceImage?: string;
  colors: string[];
  typography: ThemeTypography;
  components: ThemeComponents;
  industry?: string;
  style?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ThemeGenerationMethod =
  | 'AI Prompt'
  | 'Website Clone'
  | 'Image Analysis'
  | 'HTML Extraction';

export interface ThemeTypography {
  headingFont: string;
  bodyFont: string;
  sizes: Record<string, string>;
}

export interface ThemeComponents {
  button: Record<string, string>;
  card: Record<string, string>;
  input: Record<string, string>;
}

// ============ API TYPES ============

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

export interface PaginationInput {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============ VOICE TYPES ============

export interface VoiceCommand {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  timestamp: Date;
}

export interface VoiceResponse {
  text: string;
  audio?: ArrayBuffer;
  actions?: VoiceAction[];
}

export interface VoiceAction {
  type: 'navigate' | 'create' | 'edit' | 'delete' | 'select' | 'search';
  target: string;
  params?: Record<string, unknown>;
}

// ============ CANVAS TYPES ============

export interface CanvasComponent {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children?: CanvasComponent[];
  styles?: Record<string, string>;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

export interface CanvasState {
  components: CanvasComponent[];
  selectedId?: string;
  zoom: number;
  pan: { x: number; y: number };
  device: 'desktop' | 'tablet' | 'mobile';
  history: CanvasHistoryEntry[];
  historyIndex: number;
}

export interface CanvasHistoryEntry {
  timestamp: Date;
  action: string;
  components: CanvasComponent[];
}

// ============ CHAT TYPES ============

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agentName?: AgentName;
  metadata?: ChatMessageMetadata;
}

export interface ChatMessageMetadata {
  tokensUsed?: number;
  latencyMs?: number;
  actions?: VoiceAction[];
  codeChanges?: CodeChange[];
}

export interface CodeChange {
  file: string;
  type: 'create' | 'update' | 'delete';
  content?: string;
  diff?: string;
}

// ============ ADMIN TYPES ============

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  publishedProjects: number;
  totalRevenue: number;
  monthlyRevenue: number;
  apiCalls: number;
  storageUsed: number;
}

export interface UserActivity {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  ip?: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  services: ServiceHealth[];
  lastCheck: Date;
}

export interface ServiceHealth {
  name: string;
  status: 'up' | 'down';
  latency?: number;
  errorRate?: number;
  lastError?: string;
}

// ============ PUBLISH TYPES ============

export interface PublishConfig {
  subdomain: string;
  customDomain?: string;
  sslEnabled: boolean;
  cdnEnabled: boolean;
  analytics?: AnalyticsConfig;
  seo?: SeoConfig;
}

export interface AnalyticsConfig {
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  customScript?: string;
}

export interface SeoConfig {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  twitterCard?: string;
}

export interface PublishResult {
  success: boolean;
  url: string;
  sslCertificate?: {
    issuer: string;
    validUntil: Date;
  };
  cdnUrl?: string;
  dnsRecords?: DnsRecord[];
}

export interface DnsRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT';
  name: string;
  value: string;
  ttl: number;
}

// ============ SUBSCRIPTION TYPES ============

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: SubscriptionLimits;
}

export interface SubscriptionLimits {
  maxProjects: number;
  maxUsers: number;
  maxStorage: number;
  maxApiCalls: number;
  customDomain: boolean;
  prioritySupport: boolean;
  whiteLabel: boolean;
}

// ============ UTILITY TYPES ============

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

export type Nullable<T> = T | null;

export type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> =
  T extends (...args: unknown[]) => Promise<infer R> ? R : unknown;
