// ==============================================
// PLUGSPACE.IO TITAN v1.4 - SESSION MANAGER
// ==============================================
// Voice session lifecycle management with
// Redis-backed state persistence
// ==============================================

import { Redis } from 'ioredis';
import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

// ============ TYPES ============

export interface VoiceSession {
  sessionId: string;
  userId: string;
  organizationId: string;
  projectId?: string;

  connection: {
    websocket: WebSocket;
    status: 'connected' | 'streaming' | 'paused' | 'disconnected';
    quality: 'high' | 'medium' | 'low';
    latency: number;
  };

  audio: {
    inputFormat: string;
    outputFormat: string;
    sampleRate: number;
    channels: number;
    bitrate: number;
  };

  language: {
    input: string;
    output: string;
    autoDetect: boolean;
  };

  context: {
    conversationHistory: Message[];
    currentIntent?: string;
    confidence: number;
    entities: ExtractedEntity[];
    sentiment: 'positive' | 'neutral' | 'negative';
  };

  features: {
    transcription: boolean;
    translation: boolean;
    sentimentAnalysis: boolean;
    intentDetection: boolean;
    voiceCloning: boolean;
  };

  metrics: {
    startedAt: Date;
    duration: number;
    audioReceived: number;
    audioSent: number;
    messagesCount: number;
    errors: number;
  };

  security: {
    encrypted: boolean;
    ipAddress: string;
    userAgent: string;
    deviceId?: string;
  };
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ExtractedEntity {
  type: string;
  value: string;
  confidence: number;
}

export interface CreateSessionParams {
  connectionId: string;
  userId: string;
  organizationId: string;
  projectId?: string;
  ws: WebSocket;
  ipAddress: string;
  userAgent: string;
  deviceId?: string;
}

// ============ SESSION MANAGER ============

export class SessionManager {
  private redis: Redis;
  private sessions: Map<string, VoiceSession> = new Map();
  private readonly SESSION_TTL = 3600; // 1 hour
  private readonly KEY_PREFIX = 'plugspace:voice:session:';
  private readonly USER_SESSIONS_PREFIX = 'plugspace:voice:user:';

  constructor(redis: Redis) {
    this.redis = redis;
  }

  // ============ SESSION LIFECYCLE ============

  async createSession(params: CreateSessionParams): Promise<VoiceSession> {
    const sessionId = uuidv4();

    const session: VoiceSession = {
      sessionId,
      userId: params.userId,
      organizationId: params.organizationId,
      projectId: params.projectId,

      connection: {
        websocket: params.ws,
        status: 'connected',
        quality: 'high',
        latency: 0,
      },

      audio: {
        inputFormat: 'webm/opus',
        outputFormat: 'mp3',
        sampleRate: 16000,
        channels: 1,
        bitrate: 64000,
      },

      language: {
        input: 'en-US',
        output: 'en-US',
        autoDetect: true,
      },

      context: {
        conversationHistory: [],
        confidence: 0,
        entities: [],
        sentiment: 'neutral',
      },

      features: {
        transcription: true,
        translation: false,
        sentimentAnalysis: true,
        intentDetection: true,
        voiceCloning: true,
      },

      metrics: {
        startedAt: new Date(),
        duration: 0,
        audioReceived: 0,
        audioSent: 0,
        messagesCount: 0,
        errors: 0,
      },

      security: {
        encrypted: true,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        deviceId: params.deviceId,
      },
    };

    // Store in memory for quick access
    this.sessions.set(sessionId, session);

    // Store in Redis for persistence
    await this.persistSession(session);

    // Track user sessions
    await this.addUserSession(params.userId, sessionId);

    logger.info('Session created', {
      sessionId,
      userId: params.userId,
      organizationId: params.organizationId,
    });

    return session;
  }

  async getSession(sessionId: string): Promise<VoiceSession | null> {
    // Try memory first
    const memorySession = this.sessions.get(sessionId);
    if (memorySession) return memorySession;

    // Try Redis
    const key = `${this.KEY_PREFIX}${sessionId}`;
    const data = await this.redis.get(key);
    if (data) {
      const session: VoiceSession = JSON.parse(data);
      // Restore non-serializable properties
      session.connection.websocket = null as any;
      return session;
    }

    return null;
  }

  async updateSession(session: VoiceSession): Promise<void> {
    this.sessions.set(session.sessionId, session);
    await this.persistSession(session);
  }

  async updateActivity(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      // Refresh TTL
      const key = `${this.KEY_PREFIX}${sessionId}`;
      await this.redis.expire(key, this.SESSION_TTL);
    }
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      session.connection.status = 'disconnected';
      session.metrics.duration = Date.now() - session.metrics.startedAt.getTime();

      // Persist final state
      await this.persistSession(session);

      // Remove from user sessions
      await this.removeUserSession(session.userId, sessionId);

      // Remove from memory
      this.sessions.delete(sessionId);

      logger.info('Session ended', {
        sessionId,
        userId: session.userId,
        duration: session.metrics.duration,
        messagesCount: session.metrics.messagesCount,
      });
    }
  }

  // ============ CONTEXT MANAGEMENT ============

  async addMessage(sessionId: string, message: Message): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.context.conversationHistory.push(message);
      
      // Keep only last 50 messages
      if (session.context.conversationHistory.length > 50) {
        session.context.conversationHistory = session.context.conversationHistory.slice(-50);
      }

      await this.updateSession(session);
    }
  }

  async updateIntent(sessionId: string, intent: string, confidence: number): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.context.currentIntent = intent;
      session.context.confidence = confidence;
      await this.updateSession(session);
    }
  }

  async addEntities(sessionId: string, entities: ExtractedEntity[]): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.context.entities = [...session.context.entities, ...entities];
      
      // Keep only last 100 entities
      if (session.context.entities.length > 100) {
        session.context.entities = session.context.entities.slice(-100);
      }

      await this.updateSession(session);
    }
  }

  async clearContext(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.context = {
        conversationHistory: [],
        confidence: 0,
        entities: [],
        sentiment: 'neutral',
      };
      await this.updateSession(session);
    }
  }

  // ============ USER SESSIONS ============

  async getUserSessionCount(userId: string): Promise<number> {
    const key = `${this.USER_SESSIONS_PREFIX}${userId}`;
    const count = await this.redis.scard(key);
    return count;
  }

  async getUserSessions(userId: string): Promise<string[]> {
    const key = `${this.USER_SESSIONS_PREFIX}${userId}`;
    const sessionIds = await this.redis.smembers(key);
    return sessionIds;
  }

  private async addUserSession(userId: string, sessionId: string): Promise<void> {
    const key = `${this.USER_SESSIONS_PREFIX}${userId}`;
    await this.redis.sadd(key, sessionId);
    await this.redis.expire(key, this.SESSION_TTL);
  }

  private async removeUserSession(userId: string, sessionId: string): Promise<void> {
    const key = `${this.USER_SESSIONS_PREFIX}${userId}`;
    await this.redis.srem(key, sessionId);
  }

  // ============ PERSISTENCE ============

  private async persistSession(session: VoiceSession): Promise<void> {
    const key = `${this.KEY_PREFIX}${session.sessionId}`;
    
    // Create a serializable copy (without WebSocket)
    const serializable = {
      ...session,
      connection: {
        ...session.connection,
        websocket: undefined,
      },
    };

    await this.redis.setex(key, this.SESSION_TTL, JSON.stringify(serializable));
  }

  // ============ CLEANUP ============

  async cleanupInactiveSessions(maxInactiveMs: number = 600000): Promise<number> {
    let cleaned = 0;
    const now = Date.now();

    for (const [sessionId, session] of this.sessions) {
      const lastActivity = session.metrics.startedAt.getTime() + session.metrics.duration;
      if (now - lastActivity > maxInactiveMs) {
        await this.endSession(sessionId);
        cleaned++;
      }
    }

    logger.info('Cleaned inactive sessions', { count: cleaned });
    return cleaned;
  }

  // ============ STATS ============

  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  async getStats(): Promise<SessionStats> {
    const activeSessions = Array.from(this.sessions.values());
    
    const totalAudioReceived = activeSessions.reduce(
      (sum, s) => sum + s.metrics.audioReceived, 0
    );
    const totalMessages = activeSessions.reduce(
      (sum, s) => sum + s.metrics.messagesCount, 0
    );
    const avgLatency = activeSessions.length > 0
      ? activeSessions.reduce((sum, s) => sum + s.connection.latency, 0) / activeSessions.length
      : 0;

    const connectionQuality = {
      high: activeSessions.filter(s => s.connection.quality === 'high').length,
      medium: activeSessions.filter(s => s.connection.quality === 'medium').length,
      low: activeSessions.filter(s => s.connection.quality === 'low').length,
    };

    return {
      activeSessions: activeSessions.length,
      totalAudioReceived,
      totalMessages,
      avgLatency,
      connectionQuality,
    };
  }
}

// ============ INTERFACES ============

interface SessionStats {
  activeSessions: number;
  totalAudioReceived: number;
  totalMessages: number;
  avgLatency: number;
  connectionQuality: {
    high: number;
    medium: number;
    low: number;
  };
}

export default SessionManager;
