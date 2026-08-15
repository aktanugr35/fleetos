import { Request, Response, NextFunction } from 'express';
import { brokersService } from './brokers.service';
import { brokerQuerySchema, createBrokerSchema, updateBrokerSchema } from './brokers.schema';
import { successResponse, buildPaginationMeta } from '../../utils/pagination';

export class BrokersController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = brokerQuerySchema.parse(req.query);
      const { brokers, total } = await brokersService.list(req.tenantId!, query);
      const meta = buildPaginationMeta(total, {
        page: query.page,
        limit: query.limit,
        skip: (query.page - 1) * query.limit,
      });
      res.json(successResponse(brokers, meta));
    } catch (error) {
      next(error);
    }
  }

  async lookupByMc(req: Request, res: Response, next: NextFunction) {
    try {
      const rawMc = req.params.mc;
      const mc = Array.isArray(rawMc) ? rawMc[0] : rawMc;
      const broker = await brokersService.lookupByMc(req.tenantId!, mc as string);
      res.json(successResponse(broker));
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const broker = await brokersService.getById(req.tenantId!, req.params.id as string);
      res.json(successResponse(broker));
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createBrokerSchema.parse(req.body);
      const broker = await brokersService.create(req.tenantId!, input);
      res.status(201).json(successResponse(broker));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const input = updateBrokerSchema.parse(req.body);
      const broker = await brokersService.update(req.tenantId!, req.params.id as string, input);
      res.json(successResponse(broker));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await brokersService.delete(req.tenantId!, req.params.id as string);
      res.json(successResponse({ message: 'Broker deactivated' }));
    } catch (error) {
      next(error);
    }
  }
}

export const brokersController = new BrokersController();
