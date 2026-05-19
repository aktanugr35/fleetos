import { Request, Response, NextFunction } from 'express';
import { setupService } from './setup.service';
import { setupSchema } from './setup.schema';
import { successResponse } from '../../utils/pagination';

export class SetupController {
  /** GET /api/v1/setup/status */
  async getStatus(_req: Request, res: Response, next: NextFunction) {
    try {
      const setupRequired = await setupService.isSetupRequired();
      res.json(successResponse({ setupRequired }));
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/v1/setup */
  async setup(req: Request, res: Response, next: NextFunction) {
    try {
      const input = setupSchema.parse(req.body);
      const result = await setupService.bootstrap(input);

      res.cookie('fleetos_refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth',
      });

      res.status(201).json(
        successResponse({
          accessToken: result.accessToken,
          user: result.user,
          company: result.company,
        })
      );
    } catch (error) {
      next(error);
    }
  }
}

export const setupController = new SetupController();
