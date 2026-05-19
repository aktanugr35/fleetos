import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { loginSchema, changePasswordSchema } from './auth.schema';
import { successResponse } from '../../utils/pagination';
import {
  clearRefreshTokenCookieOptions,
  refreshTokenCookieOptions,
} from '../../utils/cookie-options';

export class AuthController {
  /**
   * POST /api/v1/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const input = loginSchema.parse(req.body);
      const result = await authService.login(input);

      // Set refresh token as httpOnly cookie
      res.cookie('fleetos_refresh_token', result.refreshToken, refreshTokenCookieOptions());

      res.json(successResponse({
        accessToken: result.accessToken,
        user: result.user,
      }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/logout
   */
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.fleetos_refresh_token;
      const userId = req.user?.userId;

      if (userId) {
        await authService.logout(refreshToken, userId);
      }

      res.clearCookie('fleetos_refresh_token', clearRefreshTokenCookieOptions());
      res.json(successResponse({ message: 'Logged out successfully' }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/refresh
   */
  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.fleetos_refresh_token;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: { code: 'NO_TOKEN', message: 'No refresh token provided' },
        });
      }

      const result = await authService.refresh(refreshToken);

      // Set new refresh token cookie
      res.cookie('fleetos_refresh_token', result.refreshToken, refreshTokenCookieOptions());

      res.json(successResponse({
        accessToken: result.accessToken,
        user: result.user,
      }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/auth/me
   */
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const user = await authService.getMe(userId);
      res.json(successResponse(user));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/auth/me/password
   */
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const input = changePasswordSchema.parse(req.body);
      await authService.changePassword(userId, input);

      res.clearCookie('fleetos_refresh_token', clearRefreshTokenCookieOptions());
      res.json(successResponse({ message: 'Password changed successfully. Please login again.' }));
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
