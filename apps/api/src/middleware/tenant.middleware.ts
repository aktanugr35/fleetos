import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from './errorHandler.middleware';

/**
 * Multi-tenant isolation
 * SUPER_ADMIN passes ?tenantId= (validated to exist).
 * Others use JWT companyId.
 */
export async function tenantMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = req.user;

    if (!user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    }

    if (user.role === 'SUPER_ADMIN') {
      const q = (req.query.tenantId as string | undefined)?.trim();
      let resolved = q || user.companyId || undefined;

      if (!resolved) {
        const companyCount = await prisma.company.count({ where: { isActive: true } });
        if (companyCount === 1) {
          const only = await prisma.company.findFirst({
            where: { isActive: true },
            select: { id: true },
          });
          resolved = only?.id;
        }
      }

      if (!resolved) {
        return next(
          new AppError(
            400,
            'TENANT_REQUIRED',
            'Specify tenantId query parameter to select a company (required when multiple companies exist)'
          )
        );
      }

      const company = await prisma.company.findFirst({
        where: { id: resolved, isActive: true },
        select: { id: true },
      });
      if (!company) {
        return next(new AppError(404, 'NOT_FOUND', 'Company not found'));
      }
      req.tenantId = resolved;
      return next();
    }

    if (!user.companyId) {
      return next(new AppError(403, 'NO_TENANT', 'No tenant context available'));
    }

    const company = await prisma.company.findFirst({
      where: { id: user.companyId, isActive: true },
      select: { id: true },
    });
    if (!company) {
      return next(new AppError(403, 'NO_TENANT', 'Company access is no longer available'));
    }

    req.tenantId = user.companyId;
    return next();
  } catch (error) {
    next(error as Error);
  }
}
