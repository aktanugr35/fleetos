import { Request, Response, NextFunction } from 'express';
import { env, isProdLikeEnv } from '../config/env';
import { prisma } from '../config/database';
import { AppError } from './errorHandler.middleware';
import { verifyAccessToken } from '../modules/auth/auth.tokens';
import { redisGetStrict } from '../utils/redis-strict';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  companyId: string | null;
  jti?: string;
  tv?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      tenantId?: string;
      /** Set for DRIVER-role users after linked-driver resolution */
      linkedDriverId?: string;
    }
  }
}

function readAccessToken(req: Request): string | null {
  // Production sessions are httpOnly cookies only — Bearer is a leftover XSS target.
  if (!isProdLikeEnv()) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice('Bearer '.length).trim() || null;
    }
  }
  const cookie = req.cookies?.haulyard_access_token;
  return typeof cookie === 'string' && cookie.length > 0 ? cookie : null;
}

/**
 * JWT Authentication middleware.
 * Production: httpOnly cookie. Development also accepts Authorization: Bearer.
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  void (async () => {
    try {
      const token = readAccessToken(req);
      if (!token) {
        throw new AppError(401, 'UNAUTHORIZED', 'Access token is required');
      }

      const decoded = verifyAccessToken(token, env.JWT_ACCESS_SECRET);

      if (decoded.jti) {
        const blocked = await redisGetStrict(`jwt:bl:${decoded.jti}`);
        if (blocked) {
          throw new AppError(401, 'TOKEN_REVOKED', 'Access token has been revoked');
        }
      }

      if (decoded.tv != null) {
        const epoch = await redisGetStrict(`jwt:epoch:${decoded.userId}`);
        if (epoch && Number(epoch) > decoded.tv) {
          throw new AppError(401, 'TOKEN_REVOKED', 'Access token has been revoked');
        }
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { isActive: true, role: true, companyId: true, email: true },
      });
      if (!user || !user.isActive) {
        throw new AppError(401, 'ACCOUNT_DISABLED', 'Your account has been disabled');
      }

      req.user = {
        userId: decoded.userId,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        jti: decoded.jti,
        tv: decoded.tv,
      };

      next();
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      if ((error as { name?: string }).name === 'TokenExpiredError') {
        return next(new AppError(401, 'TOKEN_EXPIRED', 'Access token has expired'));
      }
      return next(new AppError(401, 'INVALID_TOKEN', 'Invalid access token'));
    }
  })();
}
