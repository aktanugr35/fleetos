import express from 'express';
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
import { csrfCookieGuard } from './middleware/csrf.middleware';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.middleware';
import { successResponse } from './utils/pagination';
import authRoutes from './modules/auth/auth.routes';
import driverRoutes from './modules/drivers/drivers.routes';
import dispatcherRoutes from './modules/dispatchers/dispatchers.routes';
import brokerRoutes from './modules/brokers/brokers.routes';
import truckRoutes from './modules/trucks/trucks.routes';
import trailerRoutes from './modules/trailers/trailers.routes';
import complianceRoutes from './modules/compliance/compliance.routes';
import loadRoutes from './modules/loads/loads.routes';
import settlementRoutes from './modules/settlements/settlements.routes';
import dispatcherSettlementRoutes from './modules/dispatcher-settlements/dispatcher-settlements.routes';
import deductionRoutes from './modules/deductions/deductions.routes';
import creditRoutes from './modules/credits/credits.routes';
import documentsRoutes from './modules/documents/documents.routes';
import companiesRoutes from './modules/companies/companies.routes';
import reportRoutes from './modules/reports/reports.routes';
import driverPortalRoutes from './modules/driver-portal/driver-portal.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import setupRoutes from './modules/setup/setup.routes';
import fuelTollRoutes from './modules/fuel-toll/fuel-toll.routes';
import geoRoutes from './modules/geo/geo.routes';
import usersRoutes from './modules/users/users.routes';
import driverIntakeRoutes from './modules/driver-intake/driver-intake.routes';
import passwordsRoutes from './modules/passwords/passwords.routes';

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
    referrerPolicy: { policy: 'no-referrer' },
  }),
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (origin === 'null') {
        callback(new Error('CORS blocked: null origin'));
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
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }
  csrfCookieGuard(req, res, next);
});
app.use(morgan('combined', {
  stream: { write: (message: string) => logger.info(message.trim()) },
}));
app.use(generalLimiter);

// Files are served only through authenticated download routes. Never expose /uploads.

// ─── Health Check ───────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const redisPing = await redis.ping();
    if (redisPing !== 'PONG') {
      throw new Error('redis');
    }

    res.json(successResponse({ status: 'healthy' }));
  } catch {
    res.status(503).json(successResponse({ status: 'unhealthy' }));
  }
});

// ─── API Routes ─────────────────────────────────────────
app.use('/api/v1/setup', setupRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/companies', companiesRoutes);
app.use('/api/v1/drivers', driverRoutes);
app.use('/api/v1/dispatchers', dispatcherRoutes);
app.use('/api/v1/brokers', brokerRoutes);
app.use('/api/v1/trucks', truckRoutes);
app.use('/api/v1/trailers', trailerRoutes);
app.use('/api/v1/loads', loadRoutes);
app.use('/api/v1/settlements', settlementRoutes);
app.use('/api/v1/dispatcher-settlements', dispatcherSettlementRoutes);
app.use('/api/v1/deductions', deductionRoutes);
app.use('/api/v1/credits', creditRoutes);
app.use('/api/v1/compliance', complianceRoutes);
app.use('/api/v1/passwords', passwordsRoutes);
app.use('/api/v1/documents', documentsRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/driver-portal', driverPortalRoutes);
app.use('/api/v1/geo', geoRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1', driverIntakeRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1', fuelTollRoutes);

// ─── Error Handling ─────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
