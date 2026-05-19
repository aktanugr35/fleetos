import { Request, Response, NextFunction } from 'express';
import { deductionsService } from './deductions.service';
import { createDeductionSchema, updateDeductionSchema } from '../settlements/settlements.schema';
import { successResponse, buildPaginationMeta } from '../../utils/pagination';
import { assertDriverQueryScoped } from '../../utils/driverScope';

export class DeductionsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      let driverId = req.query.driverId as string | undefined;
      if (req.user?.role === 'DRIVER') {
        assertDriverQueryScoped(req, driverId);
        driverId = req.linkedDriverId;
      }
      const { deductions, total } = await deductionsService.list(req.tenantId!, driverId, page, limit);
      res.json(successResponse(deductions, buildPaginationMeta(total, { page, limit, skip: (page - 1) * limit })));
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createDeductionSchema.parse(req.body);
      const deduction = await deductionsService.create(req.tenantId!, input);
      res.status(201).json(successResponse(deduction));
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const input = updateDeductionSchema.parse(req.body);
      const deduction = await deductionsService.update(req.tenantId!, req.params.id as string, input);
      res.json(successResponse(deduction));
    } catch (error) { next(error); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await deductionsService.delete(req.tenantId!, req.params.id as string);
      res.json(successResponse({ message: 'Deduction deleted' }));
    } catch (error) { next(error); }
  }
}

export const deductionsController = new DeductionsController();
