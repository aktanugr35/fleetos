import { prisma } from './config/database';
import { redis } from './config/redis';
import { logger } from './utils/logger';
import { initSentry } from './config/sentry';
import { bootstrap } from './bootstrap';

void initSentry();

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
});

bootstrap().catch((error) => {
  logger.error('❌ Failed to start server:', error);
  process.exit(1);
});
