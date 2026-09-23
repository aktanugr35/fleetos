import crypto from 'crypto';
import { Request } from 'express';
import { env, isProdLikeEnv } from '../../config/env';
import { AppError } from '../../middleware/errorHandler.middleware';

function secretsEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function isLoopback(req: Request): boolean {
  const ip = req.ip || req.socket.remoteAddress || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

function readProvidedSecret(req: Request): string {
  const header = req.header('x-setup-secret');
  if (typeof header === 'string' && header.length > 0) return header;
  const body = req.body as { setupSecret?: unknown } | undefined;
  if (typeof body?.setupSecret === 'string') return body.setupSecret;
  return '';
}

/**
 * First-run bootstrap must not be a public race.
 * Production requires SETUP_SECRET. Local dev may skip it from loopback only.
 */
export function assertSetupAuthorized(req: Request): void {
  const expected = env.SETUP_SECRET;
  const provided = readProvidedSecret(req);

  if (expected) {
    if (!secretsEqual(provided, expected)) {
      throw new AppError(403, 'SETUP_FORBIDDEN', 'Invalid setup key');
    }
    return;
  }

  if (isProdLikeEnv()) {
    throw new AppError(
      403,
      'SETUP_DISABLED',
      'Set SETUP_SECRET before running first-time setup',
    );
  }

  if (!isLoopback(req)) {
    throw new AppError(403, 'SETUP_FORBIDDEN', 'Setup is only allowed from this machine');
  }
}
