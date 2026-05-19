import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './errorHandler.middleware';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  companyId: string | null;
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

/**
 * JWT Authentication middleware
 * Extracts and validates the Bearer token from Authorization header
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'Access token is required');
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    if ((error as any).name === 'TokenExpiredError') {
      return next(new AppError(401, 'TOKEN_EXPIRED', 'Access token has expired'));
    }
    return next(new AppError(401, 'INVALID_TOKEN', 'Invalid access token'));
  }
}
