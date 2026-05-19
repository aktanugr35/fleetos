import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { errorResponse } from '../utils/pagination';

async function captureServerError(err: Error): Promise<void> {
  if (!env.SENTRY_DSN) {
    return;
  }
  try {
    const Sentry = await import('@sentry/node');
    Sentry.captureException(err);
  } catch {
    // ignore
  }
}

/**
 * Custom application error
 */
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(statusCode: number, code: string, message: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found handler (404)
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json(
    errorResponse('NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`)
  );
}

/**
 * Global error handler
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Log the error
  logger.error(`${req.method} ${req.originalUrl} — ${err.message}`, {
    stack: err.stack,
    body: req.body,
  });

  const appStatus = err instanceof AppError ? err.statusCode : undefined;
  if (!appStatus || appStatus >= 500) {
    void captureServerError(err);
  }

  // AppError — known application error
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(
      errorResponse(err.code, err.message, err.details)
    );
  }

  // Prisma known error codes
  if ((err as any).code === 'P2002') {
    return res.status(409).json(
      errorResponse('DUPLICATE_ENTRY', 'A record with this value already exists', {
        target: (err as any).meta?.target,
      })
    );
  }

  if ((err as any).code === 'P2025') {
    return res.status(404).json(
      errorResponse('NOT_FOUND', 'Record not found')
    );
  }

  if (err instanceof ZodError) {
    return res.status(400).json(
      errorResponse('VALIDATION_ERROR', 'Invalid request data', err.issues)
    );
  }

  // Unknown error
  const httpStatus = (err as { statusCode?: number }).statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message;

  return res.status(httpStatus).json(
    errorResponse('INTERNAL_ERROR', message)
  );
}
