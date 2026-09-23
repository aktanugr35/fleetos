import { redis } from '../config/redis';
import { isProdLikeEnv } from '../config/env';
import { AppError } from '../middleware/errorHandler.middleware';

const REDIS_TIMEOUT_MS = 2000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('REDIS_TIMEOUT')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Redis GET that fails closed in production so revocation cannot be skipped. */
export async function redisGetStrict(key: string): Promise<string | null> {
  try {
    return await withTimeout(redis.get(key), REDIS_TIMEOUT_MS);
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
    await withTimeout(redis.set(key, value, 'EX', seconds), REDIS_TIMEOUT_MS);
  } catch {
    if (isProdLikeEnv()) {
      throw new AppError(503, 'AUTH_UNAVAILABLE', 'Authentication service unavailable');
    }
  }
}
