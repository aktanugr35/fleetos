import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

function resolveApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL || '';
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      // Production / VPS: always same-origin through nginx /api so cookies attach.
      return '';
    }
  }
  return fromEnv || 'http://localhost:3001';
}

const API_BASE_URL = resolveApiBase();

/** Login / refresh / logout must not trigger another refresh retry. /auth/me may. */
function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return /\/auth\/(login|refresh|logout)(\?|$|\/)/.test(url);
}

/**
 * Axios instance configured for Haulyard API.
 * Access/refresh tokens travel as httpOnly cookies — never localStorage.
 */
export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      const headers = config.headers;
      if (headers && typeof headers.delete === 'function') {
        headers.delete('Content-Type');
      } else if (headers) {
        delete (headers as { 'Content-Type'?: string })['Content-Type'];
      }
    }

    if (typeof window !== 'undefined') {
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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      originalRequest._retry = true;

      try {
        await axios.post(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        );
        return api(originalRequest);
      } catch (refreshError) {
        if (typeof window !== 'undefined') {
          useAuthStore.getState().clearAuth();
          if (!window.location.pathname.startsWith('/login')) {
            const redirect = encodeURIComponent(window.location.pathname || '/dashboard');
            window.location.replace(`/login?redirect=${redirect}`);
          }
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
