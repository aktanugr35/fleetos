import jwt from 'jsonwebtoken';

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: string;
  companyId: string | null;
}

export function signAccessToken(
  payload: AccessTokenPayload,
  secret: string,
  expiresIn: string | number = '15m',
): string {
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

export function verifyAccessToken(token: string, secret: string): AccessTokenPayload {
  return jwt.verify(token, secret) as AccessTokenPayload;
}
