import axios from 'axios';
import {
  ACCESS_TOKEN_COOKIE,
  setAccessTokenCookie,
  clearAccessTokenCookie,
} from '@/lib/auth-cookies';
import { useAuthStore } from '@/store/authStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function isAuthEndpoint(url?: string): boolean {
  return Boolean(url?.includes('/auth/'));
}

/**
 * Axios instance configured for Haulyard API
 */
export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // For refresh token cookie
});

/**
 * Request interceptor — attach access token
 */
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage (set during login)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(ACCESS_TOKEN_COOKIE);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const { user, superAdminTenantId } = useAuthStore.getState();
      if (user?.role === 'SUPER_ADMIN' && superAdminTenantId) {
        config.params = {
          ...(typeof config.params === 'object' && config.params !== null ? config.params : {}),
          tenantId: superAdminTenantId,
        };
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor — handle token refresh
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying, attempt token refresh.
    // Do not refresh auth endpoints themselves; it masks real login errors.
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = response.data.data;
        localStorage.setItem(ACCESS_TOKEN_COOKIE, accessToken);
        setAccessTokenCookie(accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed — redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem(ACCESS_TOKEN_COOKIE);
          clearAccessTokenCookie();
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
