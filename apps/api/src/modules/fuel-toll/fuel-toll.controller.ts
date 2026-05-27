import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../../utils/pagination';
import { fuelTollService } from './fuel-toll.service';
import {
  createFuelCardSchema,
  createFuelTransactionSchema,
  createTollDeviceSchema,
  createTollTransactionSchema,
  updateFuelCardSchema,
  updateFuelTransactionSchema,
  updateTollDeviceSchema,
  updateTollTransactionSchema,
} from './fuel-toll.schema';

export class FuelTollController {
  async listFuelCards(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(successResponse(await fuelTollService.listFuelCards(req.tenantId!, req.query.truckId as string | undefined)));
    } catch (error) { next(error); }
  }

  async createFuelCard(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createFuelCardSchema.parse(req.body);
      res.status(201).json(successResponse(await fuelTollService.createFuelCard(req.tenantId!, input)));
    } catch (error) { next(error); }
  }

  async updateFuelCard(req: Request, res: Response, next: NextFunction) {
    try {
      const input = updateFuelCardSchema.parse(req.body);
      res.json(successResponse(await fuelTollService.updateFuelCard(req.tenantId!, req.params.id as string, input)));
    } catch (error) { next(error); }
  }

  async listFuelTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(successResponse(await fuelTollService.listFuelTransactions(req.tenantId!, {
        truckId: req.query.truckId as string | undefined,
        fuelCardId: req.query.fuelCardId as string | undefined,
      })));
    } catch (error) { next(error); }
  }

  async createFuelTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createFuelTransactionSchema.parse(req.body);
      res.status(201).json(successResponse(await fuelTollService.createFuelTransaction(req.tenantId!, input)));
    } catch (error) { next(error); }
  }

  async updateFuelTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const input = updateFuelTransactionSchema.parse(req.body);
      res.json(successResponse(await fuelTollService.updateFuelTransaction(req.tenantId!, req.params.id as string, input)));
    } catch (error) { next(error); }
  }

  async listTollDevices(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(successResponse(await fuelTollService.listTollDevices(req.tenantId!, req.query.truckId as string | undefined)));
    } catch (error) { next(error); }
  }

  async createTollDevice(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createTollDeviceSchema.parse(req.body);
      res.status(201).json(successResponse(await fuelTollService.createTollDevice(req.tenantId!, input)));
    } catch (error) { next(error); }
  }

  async updateTollDevice(req: Request, res: Response, next: NextFunction) {
    try {
      const input = updateTollDeviceSchema.parse(req.body);
      res.json(successResponse(await fuelTollService.updateTollDevice(req.tenantId!, req.params.id as string, input)));
    } catch (error) { next(error); }
  }

  async listTollTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(successResponse(await fuelTollService.listTollTransactions(req.tenantId!, {
        truckId: req.query.truckId as string | undefined,
        tollDeviceId: req.query.tollDeviceId as string | undefined,
      })));
    } catch (error) { next(error); }
  }

  async createTollTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createTollTransactionSchema.parse(req.body);
      res.status(201).json(successResponse(await fuelTollService.createTollTransaction(req.tenantId!, input)));
    } catch (error) { next(error); }
  }

  async updateTollTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const input = updateTollTransactionSchema.parse(req.body);
      res.json(successResponse(await fuelTollService.updateTollTransaction(req.tenantId!, req.params.id as string, input)));
    } catch (error) { next(error); }
  }
}

export const fuelTollController = new FuelTollController();
