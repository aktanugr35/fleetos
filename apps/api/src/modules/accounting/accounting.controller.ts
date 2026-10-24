import { Request, Response, NextFunction } from 'express';
import { successResponse, buildPaginationMeta } from '../../utils/pagination';
import { resolveReportDateRange } from '../reports/reports.range';
import { accountingService } from './accounting.service';
import { accountingEntrySchema, accountingListQuerySchema } from './accounting.schema';

export class AccountingController {
  /** Same range options as Reports: `from`+`to` (YYYY-MM-DD) or `preset`. */
  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to, preset } = resolveReportDateRange(req);
      const data = await accountingService.getProfitAndLoss(req.tenantId!, from, to);
      res.json(successResponse({ ...data, preset: preset ?? null }));
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = accountingListQuerySchema.parse(req.query);
      const { entries, total, totalAmountCents, skip } = await accountingService.list(req.tenantId!, query);
      res.json({
        ...successResponse(entries, buildPaginationMeta(total, { page: query.page, limit: query.limit, skip })),
        totalAmountCents,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = accountingEntrySchema.parse(req.body);
      const entry = await accountingService.create(req.tenantId!, req.user?.userId, input);
      res.status(201).json(successResponse(entry));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const input = accountingEntrySchema.parse(req.body);
      const entry = await accountingService.update(req.tenantId!, req.params.id as string, input);
      res.json(successResponse(entry));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await accountingService.delete(req.tenantId!, req.params.id as string);
      res.json(successResponse({ message: 'Entry deleted' }));
    } catch (error) {
      next(error);
    }
  }
}

export const accountingController = new AccountingController();
