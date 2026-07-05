import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { generalLimiter } from './middleware/rateLimit.middleware';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.middleware';
import { successResponse } from './utils/pagination';
import { UPLOADS_DIR } from './config/paths';
import authRoutes from './modules/auth/auth.routes';
import driverRoutes from './modules/drivers/drivers.routes';
import truckRoutes from './modules/trucks/trucks.routes';
import trailerRoutes from './modules/trailers/trailers.routes';
import complianceRoutes from './modules/compliance/compliance.routes';
import loadRoutes from './modules/loads/loads.routes';
import settlementRoutes from './modules/settlements/settlements.routes';
import deductionRoutes from './modules/deductions/deductions.routes';
import creditRoutes from './modules/credits/credits.routes';
import documentsRoutes from './modules/documents/documents.routes';
import companiesRoutes from './modules/companies/companies.routes';
import reportRoutes from './modules/reports/reports.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import setupRoutes from './modules/setup/setup.routes';
import fuelTollRoutes from './modules/fuel-toll/fuel-toll.routes';
import geoRoutes from './modules/geo/geo.routes';

// ─── Express App ────────────────────────────────────────
const app = express();

app.set('trust proxy', 1);

function getCorsOrigins(): string[] {
  const origins = new Set<string>([env.FRONTEND_URL]);
  if (env.CORS_ORIGINS) {
    for (const o of env.CORS_ORIGINS.split(',')) {
      const trimmed = o.trim();
      if (trimmed) origins.add(trimmed);
    }
  }
  return [...origins];
}

// ─── Global Middleware ──────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      const allowed = getCorsOrigins();
      if (allowed.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('combined', {
  stream: { write: (message: string) => logger.info(message.trim()) },
}));
app.use(generalLimiter);

// ─── Static Files ───────────────────────────────────────
app.use('/uploads', express.static(UPLOADS_DIR));

// ─── Health Check ───────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    // Check DB connection
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis connection
    const redisPing = await redis.ping();

    res.json(successResponse({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: redisPing === 'PONG' ? 'connected' : 'disconnected',
      },
    }));
  } catch (error) {
    res.status(503).json(successResponse({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
    }));
  }
});

// ─── API Routes ─────────────────────────────────────────
app.use('/api/v1/setup', setupRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/companies', companiesRoutes);
app.use('/api/v1/drivers', driverRoutes);
app.use('/api/v1/trucks', truckRoutes);
app.use('/api/v1/trailers', trailerRoutes);
app.use('/api/v1/loads', loadRoutes);
app.use('/api/v1/settlements', settlementRoutes);
app.use('/api/v1/deductions', deductionRoutes);
app.use('/api/v1/credits', creditRoutes);
app.use('/api/v1/compliance', complianceRoutes);
app.use('/api/v1/documents', documentsRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/geo', geoRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1', fuelTollRoutes);

// ─── Error Handling ─────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
