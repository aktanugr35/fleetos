import { Request } from 'express';
import type { ApiResponse, PaginationMeta } from '@haulyard/shared-types';

export type { ApiResponse, PaginationMeta };

/**
 * Pagination parameters extracted from query string
 */
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Extract pagination params from Express request
 * Defaults: page=1, limit=20, maxLimit=100
 */
export function getPaginationParams(req: Request): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Build pagination metadata from total count
 */
export function buildPaginationMeta(
  total: number,
  params: PaginationParams
): PaginationMeta {
  const totalPages = Math.ceil(total / params.limit);

  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages,
    hasNext: params.page < totalPages,
    hasPrev: params.page > 1,
  };
}

/**
 * Standard API response wrapper
 */
export function successResponse(data: any, meta?: PaginationMeta) {
  return {
    success: true,
    data,
    ...(meta && { meta }),
  };
}

/**
 * Standard error response wrapper
 */
export function errorResponse(code: string, message: string, details?: any) {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}
