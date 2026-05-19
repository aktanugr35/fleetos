import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler.middleware';
import { logger } from '../../utils/logger';
import type { LoginInput, ChangePasswordInput } from './auth.schema';
import { signAccessToken, type AccessTokenPayload } from './auth.tokens';

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export class AuthService {
  /**
   * Login with email and password
   */
  async login(input: LoginInput) {
    const { email, password } = input;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });

    const refreshToken = await this.generateRefreshToken(user.id);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info(`User logged in: ${user.email} (${user.role})`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
        company: user.company
          ? { id: user.company.id, name: user.company.name, slug: user.company.slug }
          : null,
      },
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refresh(refreshTokenValue: string) {
    // Find refresh token
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenValue },
      include: { user: { include: { company: true } } },
    });

    if (!storedToken) {
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid refresh token');
    }

    // Check if revoked
    if (storedToken.revokedAt) {
      // Possible token reuse attack — revoke all tokens for this user
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId },
        data: { revokedAt: new Date() },
      });
      logger.warn(`Possible token reuse attack for user: ${storedToken.userId}`);
      throw new AppError(401, 'TOKEN_REUSE', 'Security violation detected. Please login again.');
    }

    // Check if expired
    if (new Date() > storedToken.expiresAt) {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Refresh token has expired');
    }

    const user = storedToken.user;
    if (!user.isActive) {
      throw new AppError(401, 'ACCOUNT_DISABLED', 'Your account has been disabled');
    }

    // Rotate: revoke old token and create new one
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const newAccessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });

    const newRefreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
        company: user.company
          ? { id: user.company.id, name: user.company.name, slug: user.company.slug }
          : null,
      },
    };
  }

  /**
   * Logout — revoke refresh token
   */
  async logout(refreshTokenValue: string, userId: string) {
    if (refreshTokenValue) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshTokenValue, userId },
        data: { revokedAt: new Date() },
      });
    }

    // Blacklist current access token in Redis (optional extra security)
    try {
      await redis.set(`blacklist:${userId}:${Date.now()}`, '1', 'EX', 900); // 15 min
    } catch {
      // Redis might not be available in dev
    }

    logger.info(`User logged out: ${userId}`);
  }

  /**
   * Get current user profile
   */
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true, driver: true },
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: user.companyId,
      company: user.company
        ? { id: user.company.id, name: user.company.name, slug: user.company.slug, logoUrl: user.company.logoUrl }
        : null,
      driverId: user.driver?.id || null,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  /**
   * Issue access + refresh tokens after signup / bootstrap (no password check).
   */
  async issueSession(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'ACCOUNT_DISABLED', 'Account is not available');
    }

    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });

    const refreshToken = await this.generateRefreshToken(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
        company: user.company
          ? { id: user.company.id, name: user.company.name, slug: user.company.slug }
          : null,
      },
    };
  }

  /**
   * Change password
   */
  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new AppError(400, 'INVALID_PASSWORD', 'Current password is incorrect');
    }

    // Hash new password
    const newHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    logger.info(`Password changed for user: ${user.email}`);
  }

  // ─── Private Helpers ──────────────────────────────────

  private generateAccessToken(payload: AccessTokenPayload): string {
    return signAccessToken(payload, env.JWT_ACCESS_SECRET, env.JWT_ACCESS_EXPIRES);
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    return token;
  }
}

export const authService = new AuthService();
