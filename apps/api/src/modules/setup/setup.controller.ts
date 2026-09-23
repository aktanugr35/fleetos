import { Request, Response, NextFunction } from 'express';
import { setupService } from './setup.service';
import { setupSchema } from './setup.schema';
import { assertSetupAuthorized } from './setup-auth';
import { successResponse } from '../../utils/pagination';
import {
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from '../../utils/cookie-options';

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
      assertSetupAuthorized(req);
      const input = setupSchema.parse(req.body);
      const result = await setupService.bootstrap(input);

      res.cookie('haulyard_refresh_token', result.refreshToken, refreshTokenCookieOptions());
      res.cookie('haulyard_access_token', result.accessToken, accessTokenCookieOptions());

      res.status(201).json(
        successResponse({
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
