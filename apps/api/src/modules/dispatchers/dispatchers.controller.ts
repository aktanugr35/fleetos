import { Request, Response, NextFunction } from 'express';
import { dispatchersService } from './dispatchers.service';
import { createDispatcherSchema, updateDispatcherSchema, dispatcherQuerySchema } from './dispatchers.schema';
import { successResponse, buildPaginationMeta } from '../../utils/pagination';

export class DispatchersController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = dispatcherQuerySchema.parse(req.query);
      const { dispatchers, total } = await dispatchersService.list(req.tenantId!, query);
      const meta = buildPaginationMeta(total, {
        page: query.page,
        limit: query.limit,
        skip: (query.page - 1) * query.limit,
      });
      res.json(successResponse(dispatchers, meta));
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const dispatcher = await dispatchersService.getById(req.tenantId!, req.params.id as string);
      res.json(successResponse(dispatcher));
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createDispatcherSchema.parse(req.body);
      const dispatcher = await dispatchersService.create(req.tenantId!, input);
      res.status(201).json(successResponse(dispatcher));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const input = updateDispatcherSchema.parse(req.body);
      const dispatcher = await dispatchersService.update(req.tenantId!, req.params.id as string, input);
      res.json(successResponse(dispatcher));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await dispatchersService.delete(req.tenantId!, req.params.id as string);
      res.json(successResponse({ message: 'Dispatcher deactivated successfully' }));
    } catch (error) {
      next(error);
    }
  }
}

export const dispatchersController = new DispatchersController();
