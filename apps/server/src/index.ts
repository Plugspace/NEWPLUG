// ==============================================
// PLUGSPACE.IO TITAN v1.4 - VOICE SERVER
// ==============================================
// High-performance WebSocket server for real-time
// bidirectional audio streaming with Gemini Live API
// ==============================================

import { WebSocketServer, WebSocket } from 'ws';
import { createServer, IncomingMessage } from 'http';
import { parse } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

import { GeminiLiveSession } from './gemini-session';
import { AudioProcessor } from './audio-processor';
import { SecurityManager, ConnectionSecurity } from './security';
import { ZaraVoice } from './zara-voice';
import { SessionManager, VoiceSession } from './session-manager';
import { VoiceMetrics } from './metrics';
import { logger } from './logger';

// ============ CONFIGURATION ============

const PORT = parseInt(process.env.VOICE_SERVER_PORT || '4001', 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(',');
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const MAX_SESSIONS_PER_USER = parseInt(process.env.MAX_SESSIONS_PER_USER || '3', 10);
const SESSION_TIMEOUT_MS = parseInt(process.env.SESSION_TIMEOUT_MS || '3600000', 10); // 1 hour
const HEARTBEAT_INTERVAL_MS = 30000;

// ============ SERVER SETUP ============

const app = express();
app.use(helmet());
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ 
  server,
  perMessageDeflate: {
    zlibDeflateOptions: { chunkSize: 1024, memLevel: 7, level: 3 },
    zlibInflateOptions: { chunkSize: 10 * 1024 },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    serverMaxWindowBits: 10,
    concurrencyLimit: 10,
    threshold: 1024,
  },
});

// Initialize services
const redis = new Redis(REDIS_URL);
const sessionManager = new SessionManager(redis);
const securityManager = new SecurityManager(redis);
const audioProcessor = new AudioProcessor();
const zaraVoice = new ZaraVoice();
const metrics = new VoiceMetrics(redis);

// ============ HEALTH ENDPOINTS ============

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    connections: wss.clients.size,
    uptime: process.uptime(),
  });
});

app.get('/metrics', async (req, res) => {
  const stats = await metrics.getStats();
  res.json(stats);
});

// ============ WEBSOCKET HANDLERS ============

wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
  const connectionId = uuidv4();
  let session: VoiceSession | null = null;
  let geminiSession: GeminiLiveSession | null = null;
  let heartbeatInterval: NodeJS.Timeout | null = null;

  logger.info('New WebSocket connection', { connectionId, ip: request.socket.remoteAddress });

  try {
    // Parse URL and extract token
    const url = parse(request.url || '', true);
    const token = url.query.token as string;
    const organizationId = url.query.orgId as string;
    const projectId = url.query.projectId as string;

    // Validate origin
    const origin = request.headers.origin || '';
    if (!securityManager.validateOrigin(origin, ALLOWED_ORIGINS)) {
      logger.warn('Invalid origin', { connectionId, origin });
      ws.close(4001, 'Invalid origin');
      return;
    }

    // Authenticate connection
    const authResult = await securityManager.authenticate(token);
    if (!authResult.success) {
      logger.warn('Authentication failed', { connectionId, error: authResult.error });
      ws.close(4002, authResult.error || 'Authentication failed');
      return;
    }

    const user = authResult.user!;

    // Check organization access
    if (organizationId) {
      const hasAccess = await securityManager.verifyOrganizationAccess(user.id, organizationId);
      if (!hasAccess) {
        logger.warn('Organization access denied', { connectionId, userId: user.id, organizationId });
        ws.close(4003, 'Organization access denied');
        return;
      }
    }

    // Check rate limits
    const rateLimit = await securityManager.checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      logger.warn('Rate limit exceeded', { connectionId, userId: user.id });
      ws.close(4029, 'Rate limit exceeded');
      return;
    }

    // Check concurrent session limit
    const sessionCount = await sessionManager.getUserSessionCount(user.id);
    if (sessionCount >= MAX_SESSIONS_PER_USER) {
      logger.warn('Max sessions reached', { connectionId, userId: user.id, count: sessionCount });
      ws.close(4030, 'Maximum concurrent sessions reached');
      return;
    }

    // Create voice session
    session = await sessionManager.createSession({
      connectionId,
      userId: user.id,
      organizationId,
      projectId,
      ws,
      ipAddress: request.socket.remoteAddress || '',
      userAgent: request.headers['user-agent'] || '',
    });

    // Send connection acknowledgment
    sendMessage(ws, {
      type: 'connected',
      sessionId: session.sessionId,
      userId: user.id,
      features: session.features,
      config: {
        sampleRate: session.audio.sampleRate,
        channels: session.audio.channels,
        chunkSize: 4096,
      },
    });

    // Start heartbeat
    heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
        sendMessage(ws, { type: 'heartbeat', timestamp: Date.now() });
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Initialize Gemini session on demand
    const initializeGemini = async () => {
      if (!geminiSession) {
        geminiSession = new GeminiLiveSession({
          sessionId: session!.sessionId,
          language: session!.language.input,
          audioConfig: session!.audio,
          features: session!.features,
        });

        await geminiSession.initialize();

        // Handle Gemini responses
        geminiSession.onTranscript((transcript) => {
          session!.context.conversationHistory.push({
            role: 'user',
            content: transcript.text,
            timestamp: new Date(),
          });

          sendMessage(ws, {
            type: 'transcript',
            data: {
              text: transcript.text,
              isFinal: transcript.isFinal,
              confidence: transcript.confidence,
              language: transcript.language,
            },
          });
        });

        geminiSession.onResponse(async (response) => {
          session!.context.conversationHistory.push({
            role: 'assistant',
            content: response.text,
            timestamp: new Date(),
          });

          // Generate Zara's voice response
          if (session!.features.voiceCloning) {
            const voiceResponse = await zaraVoice.synthesize(response.text, {
              emotion: response.emotion || 'neutral',
              context: session!.context,
            });

            sendMessage(ws, {
              type: 'voice_response',
              data: {
                text: response.text,
                audio: voiceResponse.audioBase64,
                emotion: voiceResponse.emotion,
                duration: voiceResponse.duration,
              },
            });
          } else {
            sendMessage(ws, {
              type: 'text_response',
              data: {
                text: response.text,
                intent: response.intent,
                entities: response.entities,
              },
            });
          }
        });

        geminiSession.onError((error) => {
          logger.error('Gemini session error', { sessionId: session!.sessionId, error });
          sendMessage(ws, { type: 'error', error: error.message });
        });
      }
      return geminiSession;
    };

    // Handle incoming messages
    ws.on('message', async (data: Buffer) => {
      try {
        // Try to parse as JSON first
        let message: any;
        try {
          message = JSON.parse(data.toString());
        } catch {
          // Binary audio data
          message = { type: 'audio', data };
        }

        session!.metrics.messagesCount++;
        await sessionManager.updateActivity(session!.sessionId);

        switch (message.type) {
          case 'audio':
            // Process and stream audio to Gemini
            const audioData = message.data instanceof Buffer ? message.data : Buffer.from(message.data, 'base64');
            session!.metrics.audioReceived += audioData.length;

            const gemini = await initializeGemini();
            const processed = await audioProcessor.process(audioData, {
              inputFormat: session!.audio.inputFormat,
              sampleRate: session!.audio.sampleRate,
              channels: session!.audio.channels,
            });

            await gemini.sendAudio(processed);
            break;

          case 'start_recording':
            const gs = await initializeGemini();
            await gs.startSession();
            session!.connection.status = 'streaming';
            await sessionManager.updateSession(session!);
            sendMessage(ws, { type: 'recording_started' });
            break;

          case 'stop_recording':
            if (geminiSession) {
              await geminiSession.endTurn();
              session!.connection.status = 'connected';
              await sessionManager.updateSession(session!);
            }
            sendMessage(ws, { type: 'recording_stopped' });
            break;

          case 'set_language':
            session!.language.input = message.language;
            session!.language.output = message.language;
            if (geminiSession) {
              geminiSession.setLanguage(message.language);
            }
            await sessionManager.updateSession(session!);
            sendMessage(ws, { type: 'language_updated', language: message.language });
            break;

          case 'set_features':
            Object.assign(session!.features, message.features);
            await sessionManager.updateSession(session!);
            sendMessage(ws, { type: 'features_updated', features: session!.features });
            break;

          case 'get_context':
            sendMessage(ws, {
              type: 'context',
              data: {
                history: session!.context.conversationHistory.slice(-10),
                intent: session!.context.currentIntent,
                entities: session!.context.entities,
              },
            });
            break;

          case 'clear_context':
            session!.context.conversationHistory = [];
            session!.context.currentIntent = undefined;
            session!.context.entities = [];
            await sessionManager.updateSession(session!);
            sendMessage(ws, { type: 'context_cleared' });
            break;

          case 'text_input':
            // Handle text input (for accessibility)
            const gSession = await initializeGemini();
            await gSession.sendText(message.text);
            break;

          case 'pong':
            // Heartbeat response
            session!.connection.latency = Date.now() - message.timestamp;
            break;

          default:
            logger.warn('Unknown message type', { sessionId: session!.sessionId, type: message.type });
        }

      } catch (error) {
        logger.error('Message processing error', {
          sessionId: session?.sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        session!.metrics.errors++;
        sendMessage(ws, { type: 'error', error: 'Message processing failed' });
      }
    });

    // Handle WebSocket close
    ws.on('close', async (code, reason) => {
      logger.info('WebSocket closed', {
        connectionId,
        sessionId: session?.sessionId,
        code,
        reason: reason.toString(),
      });

      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }

      if (geminiSession) {
        await geminiSession.disconnect();
      }

      if (session) {
        session.metrics.duration = Date.now() - session.metrics.startedAt.getTime();
        await sessionManager.endSession(session.sessionId);
        await metrics.recordSession(session);
      }
    });

    // Handle errors
    ws.on('error', async (error) => {
      logger.error('WebSocket error', {
        connectionId,
        sessionId: session?.sessionId,
        error: error.message,
      });

      if (session) {
        session.metrics.errors++;
        await sessionManager.updateSession(session);
      }
    });

    // Handle pong (heartbeat response)
    ws.on('pong', () => {
      if (session) {
        session.connection.latency = Date.now() - (session as any)._lastPing || 0;
      }
    });

  } catch (error) {
    logger.error('Connection setup error', {
      connectionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    ws.close(4000, 'Connection setup failed');
  }
});

// ============ UTILITY FUNCTIONS ============

function sendMessage(ws: WebSocket, message: any): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// ============ GRACEFUL SHUTDOWN ============

async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, initiating graceful shutdown`);

  // Close all WebSocket connections
  wss.clients.forEach((client) => {
    client.close(1001, 'Server shutting down');
  });

  // Close WebSocket server
  wss.close(() => {
    logger.info('WebSocket server closed');
  });

  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close Redis connection
  await redis.quit();
  logger.info('Redis connection closed');

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ============ START SERVER ============

server.listen(PORT, () => {
  logger.info(`Voice server listening on port ${PORT}`, {
    environment: process.env.NODE_ENV,
    allowedOrigins: ALLOWED_ORIGINS,
  });
});

export { app, server, wss };
