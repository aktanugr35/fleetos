import { env } from '../config/env';

function cookieSecurity() {
  const crossSite =
    process.env.CROSS_SITE_COOKIES === 'true' ||
    process.env.CROSS_SITE_COOKIES === '1';
  const secure = crossSite || env.FRONTEND_URL.startsWith('https://');
  return {
    crossSite,
    secure,
    sameSite: (crossSite ? 'none' : 'lax') as 'none' | 'lax',
  };
}

/** Refresh token cookie options. Set CROSS_SITE_COOKIES=true when the web and API are on different domains. */
export function refreshTokenCookieOptions() {
  const { secure, sameSite } = cookieSecurity();
  return {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  };
}

export function clearRefreshTokenCookieOptions() {
  const { sameSite, secure, path } = refreshTokenCookieOptions();
  return { path, secure, sameSite };
}

/** Access token cookie — httpOnly so XSS cannot read it from localStorage. */
export function accessTokenCookieOptions() {
  const { secure, sameSite } = cookieSecurity();
  return {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: 15 * 60 * 1000,
    path: '/',
  };
}

export function clearAccessTokenCookieOptions() {
  const { sameSite, secure, path } = accessTokenCookieOptions();
  return { path, secure, sameSite };
}
