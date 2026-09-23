import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { AppError } from './errorHandler.middleware';

function allowedOrigins(): Set<string> {
  const origins = new Set<string>([env.FRONTEND_URL]);
  if (env.CORS_ORIGINS) {
    for (const origin of env.CORS_ORIGINS.split(',')) {
      const trimmed = origin.trim();
      if (trimmed) origins.add(trimmed);
    }
  }
  return origins;
}

/**
 * When refresh/access tokens travel as cross-site cookies (SameSite=None), a
 * foreign page can POST to /auth/refresh. Require a matching Origin/Referer.
 */
export function csrfCookieGuard(req: Request, _res: Response, next: NextFunction) {
  if (req.headers.origin === 'null') {
    return next(new AppError(403, 'CSRF_REJECTED', 'Request origin is not allowed'));
  }

  const crossSite =
    process.env.CROSS_SITE_COOKIES === 'true' || process.env.CROSS_SITE_COOKIES === '1';
  if (!crossSite) {
    return next();
  }

  const origin = req.headers.origin;
  if (origin && allowedOrigins().has(origin)) {
    return next();
  }

  const referer = req.headers.referer;
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (allowedOrigins().has(refererOrigin)) {
        return next();
      }
    } catch {
      // fall through
    }
  }

  return next(new AppError(403, 'CSRF_REJECTED', 'Request origin is not allowed'));
}
