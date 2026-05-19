import { Request, Response, NextFunction } from 'express';
import { complianceService } from './compliance.service';
import { successResponse } from '../../utils/pagination';

export class ComplianceController {
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await complianceService.getOverview(req.tenantId!);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }
}

export const complianceController = new ComplianceController();
