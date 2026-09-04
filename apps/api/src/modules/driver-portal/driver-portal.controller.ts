import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../middleware/errorHandler.middleware';
import { successResponse } from '../../utils/pagination';
import { driverPortalService } from './driver-portal.service';
import { driverPortalWeeksSchema } from './driver-portal.schema';

/** Every handler answers for the driver linked to the session, never for an id from the client. */
function requireLinkedDriver(req: Request): string {
  if (!req.linkedDriverId) {
    throw new AppError(403, 'NO_DRIVER_PROFILE', 'No active driver profile is linked to this account');
  }
  return req.linkedDriverId;
}

export const driverPortalController = {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await driverPortalService.getSummary(req.tenantId!, requireLinkedDriver(req));
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },

  async getStatements(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await driverPortalService.getStatements(req.tenantId!, requireLinkedDriver(req));
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },

  async getCompliance(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await driverPortalService.getCompliance(req.tenantId!, requireLinkedDriver(req));
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },

  async getLoads(req: Request, res: Response, next: NextFunction) {
    try {
      const { weeks } = driverPortalWeeksSchema.parse(req.query);
      const data = await driverPortalService.getWeeklyLoads(
        req.tenantId!,
        requireLinkedDriver(req),
        weeks,
      );
      res.json(successResponse({ weeks: data }));
    } catch (error) {
      next(error);
    }
  },

  async getFuel(req: Request, res: Response, next: NextFunction) {
    try {
      const { weeks } = driverPortalWeeksSchema.parse(req.query);
      const data = await driverPortalService.getWeeklyFuel(
        req.tenantId!,
        requireLinkedDriver(req),
        weeks,
      );
      res.json(successResponse({ weeks: data }));
    } catch (error) {
      next(error);
    }
  },
};
