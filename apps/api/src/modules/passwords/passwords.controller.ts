import { Request, Response, NextFunction } from 'express';
import { passwordsService } from './passwords.service';
import {
  createPasswordSchema,
  listPasswordsQuerySchema,
  updatePasswordSchema,
} from './passwords.schema';
import { successResponse } from '../../utils/pagination';

export class PasswordsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listPasswordsQuerySchema.parse(req.query);
      const passwords = await passwordsService.list(req.tenantId!, query);
      res.json(successResponse(passwords));
    } catch (error) {
      next(error);
    }
  }

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const password = await passwordsService.getById(req.tenantId!, req.params.id as string);
      res.json(successResponse(password));
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createPasswordSchema.parse(req.body);
      const password = await passwordsService.create(req.tenantId!, input);
      res.status(201).json(successResponse(password));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const input = updatePasswordSchema.parse(req.body);
      const password = await passwordsService.update(req.tenantId!, req.params.id as string, input);
      res.json(successResponse(password));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await passwordsService.delete(req.tenantId!, req.params.id as string);
      res.json(successResponse({ message: 'Password entry deleted' }));
    } catch (error) {
      next(error);
    }
  }
}

export const passwordsController = new PasswordsController();
