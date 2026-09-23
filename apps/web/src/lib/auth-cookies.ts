/** Cookie name — must match the API httpOnly access cookie. */
export const ACCESS_TOKEN_COOKIE = 'haulyard_access_token';

/** Drop leftover XSS-readable tokens from older clients. */
export function clearLegacyAccessTokenStorage() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ACCESS_TOKEN_COOKIE);
  } catch {
    // ignore quota / private-mode failures
  }
}
