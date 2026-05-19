import { Request } from 'express';
import { AppError } from '../middleware/errorHandler.middleware';

/** DRIVER may only query their own driverId; mismatches look like missing data */
export function assertDriverQueryScoped(req: Request, requestedDriverId: string | undefined) {
  if (req.user?.role !== 'DRIVER') return;
  const self = req.linkedDriverId;
  if (requestedDriverId && requestedDriverId !== self) {
    throw new AppError(404, 'NOT_FOUND', 'Resource not found');
  }
}

export function assertDriverOwnsSettlement(req: Request, settlementDriverId: string) {
  if (req.user?.role !== 'DRIVER') return;
  if (settlementDriverId !== req.linkedDriverId) {
    throw new AppError(404, 'SETTLEMENT_NOT_FOUND', 'Settlement not found');
  }
}
