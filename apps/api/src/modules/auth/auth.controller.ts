import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { loginSchema, changePasswordSchema } from './auth.schema';
import { successResponse } from '../../utils/pagination';
import {
  accessTokenCookieOptions,
  clearAccessTokenCookieOptions,
  clearRefreshTokenCookieOptions,
  refreshTokenCookieOptions,
} from '../../utils/cookie-options';

function setSessionCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('haulyard_refresh_token', refreshToken, refreshTokenCookieOptions());
  res.cookie('haulyard_access_token', accessToken, accessTokenCookieOptions());
}

function clearSessionCookies(res: Response) {
  res.clearCookie('haulyard_refresh_token', clearRefreshTokenCookieOptions());
  res.clearCookie('haulyard_access_token', clearAccessTokenCookieOptions());
}

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const input = loginSchema.parse(req.body);
      const result = await authService.login(input);
      setSessionCookies(res, result.accessToken, result.refreshToken);
      res.json(successResponse({ user: result.user }));
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.haulyard_refresh_token;
      const userId = req.user?.userId;

      if (userId) {
        await authService.logout(refreshToken, userId, req.user?.jti);
      }

      clearSessionCookies(res);
      res.json(successResponse({ message: 'Logged out successfully' }));
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.haulyard_refresh_token;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: { code: 'NO_TOKEN', message: 'No refresh token provided' },
        });
      }

      const result = await authService.refresh(refreshToken);
      setSessionCookies(res, result.accessToken, result.refreshToken);
      res.json(successResponse({ user: result.user }));
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const user = await authService.getMe(userId);
      res.json(successResponse(user));
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const input = changePasswordSchema.parse(req.body);
      await authService.changePassword(userId, input);
      clearSessionCookies(res);
      res.json(successResponse({ message: 'Password changed successfully. Please login again.' }));
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
