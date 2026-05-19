import { Request, Response, NextFunction } from 'express';
import { trucksService } from './trucks.service';
import { createTruckSchema, updateTruckSchema } from './trucks.schema';
import { successResponse, buildPaginationMeta } from '../../utils/pagination';

export class TrucksController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { trucks, total } = await trucksService.list(
        req.tenantId!, req.query.status as string, req.query.search as string, page, limit
      );
      res.json(successResponse(trucks, buildPaginationMeta(total, { page, limit, skip: (page - 1) * limit })));
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const truck = await trucksService.getById(req.tenantId!, req.params.id as string);
      const compliance = trucksService.getComplianceStatus(truck);
      res.json(successResponse({ ...truck, compliance }));
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createTruckSchema.parse(req.body);
      const truck = await trucksService.create(req.tenantId!, input);
      res.status(201).json(successResponse(truck));
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const input = updateTruckSchema.parse(req.body);
      const truck = await trucksService.update(req.tenantId!, req.params.id as string, input);
      res.json(successResponse(truck));
    } catch (error) { next(error); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await trucksService.delete(req.tenantId!, req.params.id as string);
      res.json(successResponse({ message: 'Truck deactivated' }));
    } catch (error) { next(error); }
  }

  async getCompliance(req: Request, res: Response, next: NextFunction) {
    try {
      const truck = await trucksService.getById(req.tenantId!, req.params.id as string);
      res.json(successResponse(trucksService.getComplianceStatus(truck)));
    } catch (error) { next(error); }
  }
}

export const trucksController = new TrucksController();
