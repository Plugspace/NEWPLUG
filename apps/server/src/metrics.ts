// ==============================================
// PLUGSPACE.IO TITAN v1.4 - VOICE METRICS
// ==============================================
// Performance and usage metrics collection
// for the voice server
// ==============================================

import { Redis } from 'ioredis';
import { VoiceSession } from './session-manager';

// ============ TYPES ============

export interface VoiceMetricsData {
  timestamp: Date;
  activeSessions: number;
  totalSessions: number;
  totalAudioProcessed: number;
  totalMessages: number;
  avgLatency: number;
  errorRate: number;
  byLanguage: Record<string, number>;
  byFeature: Record<string, number>;
}

// ============ VOICE METRICS CLASS ============

export class VoiceMetrics {
  private redis: Redis;
  private readonly KEY_PREFIX = 'plugspace:voice:metrics:';

  constructor(redis: Redis) {
    this.redis = redis;
  }

  // ============ SESSION RECORDING ============

  async recordSession(session: VoiceSession): Promise<void> {
    const today = this.getDateKey();

    // Increment daily counters
    await this.redis.hincrby(`${this.KEY_PREFIX}daily:${today}`, 'sessions', 1);
    await this.redis.hincrby(`${this.KEY_PREFIX}daily:${today}`, 'audioReceived', session.metrics.audioReceived);
    await this.redis.hincrby(`${this.KEY_PREFIX}daily:${today}`, 'audioSent', session.metrics.audioSent);
    await this.redis.hincrby(`${this.KEY_PREFIX}daily:${today}`, 'messages', session.metrics.messagesCount);
    await this.redis.hincrby(`${this.KEY_PREFIX}daily:${today}`, 'errors', session.metrics.errors);
    await this.redis.hincrby(`${this.KEY_PREFIX}daily:${today}`, 'duration', session.metrics.duration);

    // Record by language
    await this.redis.hincrby(`${this.KEY_PREFIX}languages:${today}`, session.language.input, 1);

    // Record by feature usage
    for (const [feature, enabled] of Object.entries(session.features)) {
      if (enabled) {
        await this.redis.hincrby(`${this.KEY_PREFIX}features:${today}`, feature, 1);
      }
    }

    // Record latency
    if (session.connection.latency > 0) {
      await this.redis.lpush(`${this.KEY_PREFIX}latency:${today}`, session.connection.latency);
      await this.redis.ltrim(`${this.KEY_PREFIX}latency:${today}`, 0, 9999);
    }

    // Set expiry (30 days)
    await this.setExpiry(today);
  }

  // ============ REAL-TIME METRICS ============

  async recordMessage(): Promise<void> {
    const today = this.getDateKey();
    await this.redis.hincrby(`${this.KEY_PREFIX}daily:${today}`, 'messages', 1);
  }

  async recordError(): Promise<void> {
    const today = this.getDateKey();
    await this.redis.hincrby(`${this.KEY_PREFIX}daily:${today}`, 'errors', 1);
  }

  async recordLatency(latencyMs: number): Promise<void> {
    const today = this.getDateKey();
    await this.redis.lpush(`${this.KEY_PREFIX}latency:${today}`, latencyMs);
    await this.redis.ltrim(`${this.KEY_PREFIX}latency:${today}`, 0, 9999);
  }

  async recordAudioProcessed(bytes: number): Promise<void> {
    const today = this.getDateKey();
    await this.redis.hincrby(`${this.KEY_PREFIX}daily:${today}`, 'audioReceived', bytes);
  }

  // ============ STATS RETRIEVAL ============

  async getStats(date?: string): Promise<VoiceMetricsData> {
    const dateKey = date || this.getDateKey();

    const [daily, languages, features, latencies] = await Promise.all([
      this.redis.hgetall(`${this.KEY_PREFIX}daily:${dateKey}`),
      this.redis.hgetall(`${this.KEY_PREFIX}languages:${dateKey}`),
      this.redis.hgetall(`${this.KEY_PREFIX}features:${dateKey}`),
      this.redis.lrange(`${this.KEY_PREFIX}latency:${dateKey}`, 0, -1),
    ]);

    const totalSessions = parseInt(daily.sessions || '0');
    const totalErrors = parseInt(daily.errors || '0');
    const avgLatency = latencies.length > 0
      ? latencies.reduce((sum, l) => sum + parseInt(l), 0) / latencies.length
      : 0;

    return {
      timestamp: new Date(),
      activeSessions: 0, // This would come from SessionManager
      totalSessions,
      totalAudioProcessed: parseInt(daily.audioReceived || '0') + parseInt(daily.audioSent || '0'),
      totalMessages: parseInt(daily.messages || '0'),
      avgLatency: Math.round(avgLatency),
      errorRate: totalSessions > 0 ? totalErrors / totalSessions : 0,
      byLanguage: Object.fromEntries(
        Object.entries(languages).map(([k, v]) => [k, parseInt(v)])
      ),
      byFeature: Object.fromEntries(
        Object.entries(features).map(([k, v]) => [k, parseInt(v)])
      ),
    };
  }

  async getStatsRange(startDate: string, endDate: string): Promise<VoiceMetricsData[]> {
    const stats: VoiceMetricsData[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateKey = this.formatDate(d);
      stats.push(await this.getStats(dateKey));
    }

    return stats;
  }

  async getLatencyPercentiles(): Promise<{
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  }> {
    const today = this.getDateKey();
    const latencies = await this.redis.lrange(`${this.KEY_PREFIX}latency:${today}`, 0, -1);
    
    if (latencies.length === 0) {
      return { p50: 0, p90: 0, p95: 0, p99: 0 };
    }

    const sorted = latencies.map(l => parseInt(l)).sort((a, b) => a - b);
    
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  // ============ UTILITY ============

  private getDateKey(): string {
    return this.formatDate(new Date());
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private async setExpiry(dateKey: string): Promise<void> {
    const ttl = 30 * 24 * 60 * 60; // 30 days
    await this.redis.expire(`${this.KEY_PREFIX}daily:${dateKey}`, ttl);
    await this.redis.expire(`${this.KEY_PREFIX}languages:${dateKey}`, ttl);
    await this.redis.expire(`${this.KEY_PREFIX}features:${dateKey}`, ttl);
    await this.redis.expire(`${this.KEY_PREFIX}latency:${dateKey}`, ttl);
  }
}

export default VoiceMetrics;
