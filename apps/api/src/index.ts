// ==============================================
// PLUGSPACE.IO TITAN v1.4 - API SERVER
// ==============================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import { createContext } from './context';
import { connectDatabase, checkDatabaseHealth } from '@plugspace/database';
import { redis } from './lib/redis';

const app = express();
const PORT = process.env.API_PORT || 4000;

// ============ MIDDLEWARE ============

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Compression
app.use(compression());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ============ HEALTH CHECKS ============

app.get('/health', async (_req, res) => {
  const dbHealthy = await checkDatabaseHealth();
  const redisHealthy = redis.status === 'ready';

  const status = dbHealthy && redisHealthy ? 'healthy' : 'degraded';

  res.status(status === 'healthy' ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealthy ? 'up' : 'down',
      redis: redisHealthy ? 'up' : 'down',
    },
    version: process.env.APP_VERSION || '1.4.0',
  });
});

app.get('/ready', async (_req, res) => {
  const dbHealthy = await checkDatabaseHealth();

  if (dbHealthy) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false });
  }
});

// ============ tRPC ============

app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError: ({ path, error }) => {
      console.error(`❌ tRPC error on ${path}:`, error);
    },
  })
);

// ============ ERROR HANDLER ============

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    },
  });
});

// ============ 404 HANDLER ============

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
});

// ============ SERVER STARTUP ============

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    console.info('✅ Database connected');

    // Check Redis connection
    await redis.ping();
    console.info('✅ Redis connected');

    // Start server
    app.listen(PORT, () => {
      console.info(`🚀 API Server running on port ${PORT}`);
      console.info(`📡 tRPC endpoint: http://localhost:${PORT}/trpc`);
      console.info(`💊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.info('SIGTERM received, shutting down gracefully...');
  redis.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.info('SIGINT received, shutting down gracefully...');
  redis.disconnect();
  process.exit(0);
});

startServer();

export type { AppRouter } from './routers';
