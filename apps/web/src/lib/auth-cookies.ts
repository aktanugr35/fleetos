/** Cookie name — must match the API httpOnly access cookie. */
export const ACCESS_TOKEN_COOKIE = 'haulyard_access_token';

function cookieVisibleToJs(name: string): boolean {
  return document.cookie.split(';').some((part) => part.trim().startsWith(`${name}=`));
}

/** Drop leftover XSS-readable tokens from older clients. */
export function clearLegacyAccessTokenStorage() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ACCESS_TOKEN_COOKIE);
  } catch {
    // ignore quota / private-mode failures
  }

  // Older builds set a JS-readable copy of the same cookie. If both that copy
  // and the new httpOnly cookie are sent, Express may verify the stale one.
  if (!cookieVisibleToJs(ACCESS_TOKEN_COOKIE)) return;
  const expires = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
  for (const path of ['/', '/api', '/api/v1', '/api/v1/auth']) {
    document.cookie = `${ACCESS_TOKEN_COOKIE}=; ${expires}; path=${path}`;
    document.cookie = `${ACCESS_TOKEN_COOKIE}=; ${expires}; path=${path}; secure`;
  }
}
