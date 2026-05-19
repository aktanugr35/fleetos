import { Request, Response, NextFunction } from 'express';
import { driversService } from './drivers.service';
import { createDriverSchema, updateDriverSchema, driverQuerySchema } from './drivers.schema';
import { successResponse, buildPaginationMeta } from '../../utils/pagination';

export class DriversController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user?.role === 'DRIVER' && req.linkedDriverId) {
        const driver = await driversService.getById(req.tenantId!, req.linkedDriverId);
        const compliance = driversService.getComplianceStatus(driver);
        return res.json(
          successResponse(
            [{ ...driver, compliance }],
            buildPaginationMeta(1, { page: 1, limit: 1, skip: 0 }),
          ),
        );
      }

      const query = driverQuerySchema.parse(req.query);
      const { drivers, total } = await driversService.list(req.tenantId!, query);

      const meta = buildPaginationMeta(total, {
        page: query.page,
        limit: query.limit,
        skip: (query.page - 1) * query.limit,
      });

      res.json(successResponse(drivers, meta));
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id =
        req.user?.role === 'DRIVER' ? req.linkedDriverId! : (req.params.id as string);

      const driver = await driversService.getById(req.tenantId!, id);
      const compliance = driversService.getComplianceStatus(driver);
      res.json(successResponse({ ...driver, compliance }));
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createDriverSchema.parse(req.body);
      const driver = await driversService.create(req.tenantId!, input);
      res.status(201).json(successResponse(driver));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const input = updateDriverSchema.parse(req.body);
      const driver = await driversService.update(req.tenantId!, req.params.id as string, input);
      res.json(successResponse(driver));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await driversService.delete(req.tenantId!, req.params.id as string);
      res.json(successResponse({ message: 'Driver deactivated successfully' }));
    } catch (error) {
      next(error);
    }
  }

  async getLoads(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const driverId =
        req.user?.role === 'DRIVER' ? req.linkedDriverId! : (req.params.id as string);

      const { loads, total } = await driversService.getLoads(req.tenantId!, driverId, page, limit);

      const meta = buildPaginationMeta(total, { page, limit, skip: (page - 1) * limit });
      res.json(successResponse(loads, meta));
    } catch (error) {
      next(error);
    }
  }

  async getCompliance(req: Request, res: Response, next: NextFunction) {
    try {
      const id =
        req.user?.role === 'DRIVER' ? req.linkedDriverId! : (req.params.id as string);

      const driver = await driversService.getById(req.tenantId!, id);
      const compliance = driversService.getComplianceStatus(driver);
      res.json(successResponse(compliance));
    } catch (error) {
      next(error);
    }
  }
}

export const driversController = new DriversController();
