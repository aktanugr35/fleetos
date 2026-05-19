import { Request, Response, NextFunction } from 'express';
import { trailersService } from './trailers.service';
import { createTrailerSchema, updateTrailerSchema } from './trailers.schema';
import { successResponse, buildPaginationMeta } from '../../utils/pagination';

export class TrailersController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { trailers, total } = await trailersService.list(req.tenantId!, page, limit);
      res.json(successResponse(trailers, buildPaginationMeta(total, { page, limit, skip: (page - 1) * limit })));
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const trailer = await trailersService.getById(req.tenantId!, req.params.id as string);
      res.json(successResponse(trailer));
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createTrailerSchema.parse(req.body);
      const trailer = await trailersService.create(req.tenantId!, input);
      res.status(201).json(successResponse(trailer));
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const input = updateTrailerSchema.parse(req.body);
      const trailer = await trailersService.update(req.tenantId!, req.params.id as string, input);
      res.json(successResponse(trailer));
    } catch (error) { next(error); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await trailersService.delete(req.tenantId!, req.params.id as string);
      res.json(successResponse({ message: 'Trailer deactivated' }));
    } catch (error) { next(error); }
  }
}

export const trailersController = new TrailersController();
