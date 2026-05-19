import { Request, Response, NextFunction } from 'express';
import { loadsService } from './loads.service';
import { createLoadSchema, updateLoadSchema, loadQuerySchema } from './loads.schema';
import { successResponse, buildPaginationMeta } from '../../utils/pagination';
import { AppError } from '../../middleware/errorHandler.middleware';

export class LoadsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = loadQuerySchema.parse(req.query);
      const query =
        req.user?.role === 'DRIVER'
          ? { ...parsed, driverId: req.linkedDriverId! }
          : parsed;
      const { loads, total } = await loadsService.list(req.tenantId!, query);
      const meta = buildPaginationMeta(total, { page: query.page, limit: query.limit, skip: (query.page - 1) * query.limit });
      res.json(successResponse(loads, meta));
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const load = await loadsService.getById(req.tenantId!, req.params.id as string);
      if (req.user?.role === 'DRIVER') {
        const did = load.driver?.id;
        if (did !== req.linkedDriverId) {
          throw new AppError(404, 'LOAD_NOT_FOUND', 'Load not found');
        }
      }
      res.json(successResponse(load));
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createLoadSchema.parse(req.body);
      const load = await loadsService.create(req.tenantId!, input);
      res.status(201).json(successResponse(load));
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const input = updateLoadSchema.parse(req.body);
      const load = await loadsService.update(req.tenantId!, req.params.id as string, input);
      res.json(successResponse(load));
    } catch (error) { next(error); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await loadsService.delete(req.tenantId!, req.params.id as string);
      res.json(successResponse({ message: 'Load cancelled' }));
    } catch (error) { next(error); }
  }

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await loadsService.getStats(req.tenantId!);
      res.json(successResponse(stats));
    } catch (error) { next(error); }
  }
}

export const loadsController = new LoadsController();
