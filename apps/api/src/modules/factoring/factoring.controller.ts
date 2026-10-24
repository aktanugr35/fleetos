import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middleware/errorHandler.middleware';
import { buildPaginationMeta, successResponse } from '../../utils/pagination';
import { factoringService } from './factoring.service';
import { factoringListQuerySchema, submitBillingSchema, updateFeeSchema } from './factoring.schema';

export class FactoringController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = factoringListQuerySchema.parse(req.query);
      const { loads, total, summary } = await factoringService.list(req.tenantId!, query);
      const meta = buildPaginationMeta(total, { page: query.page, limit: query.limit, skip: (query.page - 1) * query.limit });
      res.json({ ...successResponse(loads, meta), summary });
    } catch (error) { next(error); }
  }

  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = submitBillingSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Choose Factoring or In-house finance');
      const load = await factoringService.submit(req.tenantId!, req.params.id as string, parsed.data.method);
      res.json(successResponse(load));
    } catch (error) { next(error); }
  }

  async updateFee(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateFeeSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Enter a valid fee amount');
      const load = await factoringService.updateFee(req.tenantId!, req.params.id as string, parsed.data.feeCents);
      res.json(successResponse(load));
    } catch (error) { next(error); }
  }

  async undo(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(successResponse(await factoringService.undo(req.tenantId!, req.params.id as string)));
    } catch (error) { next(error); }
  }
}

export const factoringController = new FactoringController();
