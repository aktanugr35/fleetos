import { Request, Response, NextFunction } from 'express';
import { STAFF_ROLES as SHARED_STAFF_ROLES, UserRole } from '@haulyard/shared-types';
import { AppError } from './errorHandler.middleware';

export type Role = `${UserRole}`;

/** Office / fleet staff (office apps); excludes DRIVER portal users */
export const STAFF_ROLES: Role[] = SHARED_STAFF_ROLES as Role[];

/**
 * Role-Based Access Control middleware factory
 * Checks if the authenticated user has one of the allowed roles
 *
 * @param allowedRoles - Array of roles that can access this route
 *
 * @example
 * router.post('/companies', rbacMiddleware(['SUPER_ADMIN']), controller.create);
 * router.post('/loads', rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN', 'DISPATCHER']), controller.create);
 */
export function rbacMiddleware(allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    }

    if (!allowedRoles.includes(user.role as Role)) {
      return next(
        new AppError(
          403,
          'FORBIDDEN',
          `Access denied. Required roles: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
}
