import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from './errorHandler.middleware';

/**
 * For DRIVER-role JWT users: resolve linked Driver profile for this tenant.
 * No-op for other roles. Requires tenantMiddleware first.
 */
export async function linkedDriverMiddleware(req: Request, _res: Response, next: NextFunction) {
  const user = req.user;
  if (!user || user.role !== 'DRIVER') return next();

  const driver = await prisma.driver.findFirst({
    where: { userId: user.userId, companyId: req.tenantId!, isActive: true },
    select: { id: true },
  });

  if (!driver) {
    return next(
      new AppError(403, 'NO_DRIVER_PROFILE', 'No active driver profile is linked to this account')
    );
  }

  req.linkedDriverId = driver.id;
  next();
}
