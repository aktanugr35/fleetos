import { env } from './env';
import { logger } from '../utils/logger';

let initialized = false;

/** Initialize Sentry when SENTRY_DSN is set (optional in all environments). */
export async function initSentry(): Promise<void> {
  if (initialized || !env.SENTRY_DSN) {
    return;
  }

  try {
    const Sentry = await import('@sentry/node');
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
    initialized = true;
    logger.info('Sentry error reporting enabled');
  } catch (err) {
    logger.warn('Sentry init skipped (package missing or misconfigured)', { err });
  }
}
