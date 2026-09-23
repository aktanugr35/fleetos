import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: string;
  companyId: string | null;
  /** Issued-at millis used to revoke every token after a password change. */
  tv?: number;
}

export function signAccessToken(
  payload: AccessTokenPayload,
  secret: string,
  expiresIn: string | number = '15m',
): string {
  return jwt.sign({ ...payload, tv: payload.tv ?? Date.now() }, secret, {
    expiresIn,
    jwtid: crypto.randomUUID(),
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string, secret: string): AccessTokenPayload & { jti?: string } {
  return jwt.verify(token, secret) as AccessTokenPayload & { jti?: string };
}
