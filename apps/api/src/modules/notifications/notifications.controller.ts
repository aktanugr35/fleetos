import { Request, Response, NextFunction } from 'express';
import { notificationsService } from './notifications.service';
import { successResponse } from '../../utils/pagination';

export class NotificationsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
      const userId = req.user!.userId;
      const data = await notificationsService.list(
        req.tenantId!,
        userId,
        Number.isFinite(limit) ? limit : 30
      );
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  }

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const notification = await notificationsService.markRead(
        req.tenantId!,
        req.user!.userId,
        req.params.id as string
      );
      res.json(successResponse(notification));
    } catch (error) {
      next(error);
    }
  }

  async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await notificationsService.markAllRead(req.tenantId!, req.user!.userId);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }
}

export const notificationsController = new NotificationsController();
