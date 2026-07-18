import { env } from './config/env';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { logger } from './utils/logger';
import { ensureUploadDirs } from './config/paths';
import { assertStorageConfig, isS3StorageEnabled } from './services/storage.service';
import { complianceService } from './modules/compliance/compliance.service';
import { startComplianceReminderScheduler } from './modules/compliance/compliance.scheduler';
import app from './app';

export async function bootstrap() {
  assertStorageConfig();

  if (!isS3StorageEnabled()) {
    ensureUploadDirs();
  }
  logger.info(
    isS3StorageEnabled()
      ? '📦 Document storage: S3'
      : '📁 Document storage: local uploads/',
  );

  await redis.connect();
  logger.info('✅ Redis connected');

  await prisma.$connect();
  logger.info('✅ Database connected');

  try {
    await complianceService.ensureCatalog();
    logger.info('✅ Compliance catalog ensured');
  } catch (error) {
    logger.error('⚠️  Failed to ensure compliance catalog:', error);
  }

  app.listen(env.API_PORT, () => {
    logger.info(`🚛 Haulyard API running on http://localhost:${env.API_PORT}`);
    logger.info(`📋 Environment: ${env.NODE_ENV}`);
  });

  startComplianceReminderScheduler();
}
