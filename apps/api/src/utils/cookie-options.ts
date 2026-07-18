import { env } from '../config/env';

/** Refresh token cookie options. Set CROSS_SITE_COOKIES=true when the web and API are on different domains. */
export function refreshTokenCookieOptions() {
  const crossSite =
    process.env.CROSS_SITE_COOKIES === 'true' ||
    process.env.CROSS_SITE_COOKIES === '1';

  // Secure cookies only over HTTPS (http://VPS-IP needs secure=false or browser drops cookie)
  const secure = crossSite || env.FRONTEND_URL.startsWith('https://');

  return {
    httpOnly: true,
    secure,
    sameSite: (crossSite ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  };
}

export function clearRefreshTokenCookieOptions() {
  const { sameSite, secure, path } = refreshTokenCookieOptions();
  return { path, secure, sameSite };
}
