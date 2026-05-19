import { Request, Response, NextFunction } from 'express';
import { creditsService } from './credits.service';
import { createCreditSchema, updateCreditSchema } from '../settlements/settlements.schema';
import { successResponse, buildPaginationMeta } from '../../utils/pagination';
import { assertDriverQueryScoped } from '../../utils/driverScope';

export class CreditsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      let driverId = req.query.driverId as string | undefined;
      if (req.user?.role === 'DRIVER') {
        assertDriverQueryScoped(req, driverId);
        driverId = req.linkedDriverId;
      }
      const { credits, total } = await creditsService.list(req.tenantId!, driverId, page, limit);
      res.json(successResponse(credits, buildPaginationMeta(total, { page, limit, skip: (page - 1) * limit })));
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createCreditSchema.parse(req.body);
      const credit = await creditsService.create(req.tenantId!, input);
      res.status(201).json(successResponse(credit));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const input = updateCreditSchema.parse(req.body);
      const credit = await creditsService.update(req.tenantId!, req.params.id as string, input);
      res.json(successResponse(credit));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await creditsService.delete(req.tenantId!, req.params.id as string);
      res.json(successResponse({ message: 'Credit deleted' }));
    } catch (error) {
      next(error);
    }
  }
}

export const creditsController = new CreditsController();
