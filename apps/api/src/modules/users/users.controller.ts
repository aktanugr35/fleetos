import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';
import { createUserSchema, updateUserSchema, userQuerySchema } from './users.schema';
import { successResponse, buildPaginationMeta } from '../../utils/pagination';

export class UsersController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = userQuerySchema.parse(req.query);
      const { users, total } = await usersService.list(req.tenantId!, query);
      const meta = buildPaginationMeta(total, {
        page: query.page,
        limit: query.limit,
        skip: (query.page - 1) * query.limit,
      });
      res.json(successResponse(users, meta));
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.getById(req.tenantId!, req.params.id as string);
      res.json(successResponse(user));
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createUserSchema.parse(req.body);
      const user = await usersService.create(req.tenantId!, req.user!, input);
      res.status(201).json(successResponse(user));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const input = updateUserSchema.parse(req.body);
      const user = await usersService.update(req.tenantId!, req.user!, req.params.id as string, input);
      res.json(successResponse(user));
    } catch (error) {
      next(error);
    }
  }

  async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.params.id === req.user?.userId) {
        return res.status(400).json({
          success: false,
          error: { code: 'CANNOT_DEACTIVATE_SELF', message: 'You cannot deactivate your own account' },
        });
      }
      const user = await usersService.deactivate(req.tenantId!, req.user!, req.params.id as string);
      res.json(successResponse(user));
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();
