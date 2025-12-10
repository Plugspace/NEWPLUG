// ==============================================
// PLUGSPACE.IO TITAN v1.4 - SECURITY UTILITIES
// ==============================================

import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { nanoid } from 'nanoid';

// ============ HASHING ============

export function hashSHA256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

export function hashSHA512(data: string): string {
  return createHash('sha512').update(data).digest('hex');
}

export function hashMD5(data: string): string {
  return createHash('md5').update(data).digest('hex');
}

// ============ RANDOM GENERATION ============

export function generateId(length: number = 21): string {
  return nanoid(length);
}

export function generateApiKey(): string {
  return `ps_${nanoid(32)}`;
}

export function generateSecretKey(): string {
  return randomBytes(32).toString('hex');
}

export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

export function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

// ============ ENCRYPTION ============

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

export function encrypt(text: string, key: string): string {
  const keyBuffer = Buffer.from(key.padEnd(32, '0').slice(0, 32));
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string, key: string): string {
  const keyBuffer = Buffer.from(key.padEnd(32, '0').slice(0, 32));
  const [ivHex, tagHex, encrypted] = encryptedText.split(':');

  if (!ivHex || !tagHex || !encrypted) {
    throw new Error('Invalid encrypted text format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ============ SANITIZATION ============

export function sanitizeHtml(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function sanitizeForRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
}

// ============ RATE LIMITING ============

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

const rateLimitStore: RateLimitStore = {};

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore[key];

  if (!entry || now > entry.resetAt) {
    rateLimitStore[key] = {
      count: 1,
      resetAt: now + windowMs,
    };
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: rateLimitStore[key]!.resetAt,
    };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// ============ INPUT VALIDATION ============

export function isSecurePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;

  const maskedLocal =
    localPart.length > 2
      ? `${localPart[0]}${'*'.repeat(localPart.length - 2)}${localPart[localPart.length - 1]}`
      : '*'.repeat(localPart.length);

  return `${maskedLocal}@${domain}`;
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return '*'.repeat(key.length);
  return `${key.slice(0, 4)}${'*'.repeat(key.length - 8)}${key.slice(-4)}`;
}

// ============ CSRF PROTECTION ============

export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

export function verifyCsrfToken(token: string, expectedToken: string): boolean {
  if (token.length !== expectedToken.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
  }
  return result === 0;
}

// ============ XSS PROTECTION ============

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<link/gi,
  /<meta/gi,
];

export function containsXss(input: string): boolean {
  return XSS_PATTERNS.some((pattern) => pattern.test(input));
}

export function stripXss(input: string): string {
  let result = input;
  for (const pattern of XSS_PATTERNS) {
    result = result.replace(pattern, '');
  }
  return result;
}

// ============ SQL INJECTION PROTECTION ============

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/gi,
  /--/g,
  /;/g,
  /\/\*/g,
  /\*\//g,
];

export function containsSqlInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

// ============ IP UTILITIES ============

export function isValidIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255 && part === num.toString();
  });
}

export function isValidIPv6(ip: string): boolean {
  const regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return regex.test(ip);
}

export function isPrivateIP(ip: string): boolean {
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^localhost$/i,
  ];

  return privateRanges.some((range) => range.test(ip));
}
