import { redis } from '../config/redis';
import { isProdLikeEnv } from '../config/env';
import { AppError } from '../middleware/errorHandler.middleware';

/** Redis GET that fails closed in production so revocation cannot be skipped. */
export async function redisGetStrict(key: string): Promise<string | null> {
  try {
    return await redis.get(key);
  } catch {
    if (isProdLikeEnv()) {
      throw new AppError(503, 'AUTH_UNAVAILABLE', 'Authentication service unavailable');
    }
    return null;
  }
}

/** Redis SET that fails closed in production so logout/password-change cannot silently skip revocation. */
export async function redisSetStrict(
  key: string,
  value: string,
  seconds: number,
): Promise<void> {
  try {
    await redis.set(key, value, 'EX', seconds);
  } catch {
    if (isProdLikeEnv()) {
      throw new AppError(503, 'AUTH_UNAVAILABLE', 'Authentication service unavailable');
    }
  }
}
