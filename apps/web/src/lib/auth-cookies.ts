/** Cookie name — must match middleware and localStorage key */
export const ACCESS_TOKEN_COOKIE = 'fleetos_access_token';

const MAX_AGE_SECONDS = 15 * 60; // matches JWT_ACCESS_EXPIRES default (15m)

export function setAccessTokenCookie(token: string) {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${ACCESS_TOKEN_COOKIE}=${token}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export function clearAccessTokenCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${ACCESS_TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function getAccessTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_COOKIE);
}
