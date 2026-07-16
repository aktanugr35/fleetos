import { Request, Response, NextFunction } from 'express';
import { driverIntakeService } from './driver-intake.service';
import { successResponse } from '../../utils/pagination';

export class DriverIntakeController {
  async getPublicContext(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await driverIntakeService.getPublicContext(req.params.token as string);
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  }

  async submitPublicForm(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await driverIntakeService.submitPublicForm(req.params.token as string, req.body);
      res.status(201).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  async createLink(req: Request, res: Response, next: NextFunction) {
    try {
      const link = await driverIntakeService.createIntakeLink(
        req.tenantId!,
        req.params.driverId as string,
        req.user!.userId,
      );
      res.status(201).json(successResponse(link));
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await driverIntakeService.getIntakeStatus(
        req.tenantId!,
        req.params.driverId as string,
      );
      res.json(successResponse(status));
    } catch (error) {
      next(error);
    }
  }
}

export const driverIntakeController = new DriverIntakeController();
