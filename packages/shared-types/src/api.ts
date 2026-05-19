export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  meta?: PaginationMeta;
  error?: ApiError;
}

export function isApiSuccess<T>(res: ApiResponse<T>): res is ApiResponse<T> & { data: T } {
  return res.success === true && res.data !== undefined;
}
