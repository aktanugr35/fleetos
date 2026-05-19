'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ACCESS_TOKEN_COOKIE,
  setAccessTokenCookie,
  clearAccessTokenCookie,
} from '@/lib/auth-cookies';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: string | null;
}

export interface SuperAdminCompanyOption {
  id: string;
  name: string;
  slug: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  /** Active tenant for SUPER_ADMIN API calls (?tenantId=); ignored for other roles */
  superAdminTenantId: string | null;
  superAdminCompanies: SuperAdminCompanyOption[] | null;

  setAuth: (user: AuthUser, accessToken: string) => void;
  clearAuth: () => void;
  updateToken: (accessToken: string) => void;
  setSuperAdminTenantId: (id: string | null) => void;
  setSuperAdminCompanies: (companies: SuperAdminCompanyOption[] | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      superAdminTenantId: null,
      superAdminCompanies: null,

      setAuth: (user, accessToken) => {
        localStorage.setItem(ACCESS_TOKEN_COOKIE, accessToken);
        setAccessTokenCookie(accessToken);
        set((state) => {
          const sameUser = state.user?.id === user.id;
          return {
            user,
            accessToken,
            isAuthenticated: true,
            superAdminTenantId: sameUser ? state.superAdminTenantId : null,
            superAdminCompanies: sameUser ? state.superAdminCompanies : null,
          };
        });
      },

      clearAuth: () => {
        localStorage.removeItem(ACCESS_TOKEN_COOKIE);
        clearAccessTokenCookie();
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          superAdminTenantId: null,
          superAdminCompanies: null,
        });
      },

      setSuperAdminTenantId: (id) => set({ superAdminTenantId: id }),

      setSuperAdminCompanies: (companies) => set({ superAdminCompanies: companies }),

      updateToken: (accessToken) => {
        localStorage.setItem(ACCESS_TOKEN_COOKIE, accessToken);
        setAccessTokenCookie(accessToken);
        set({ accessToken });
      },
    }),
    {
      name: 'fleetos-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        superAdminTenantId: state.superAdminTenantId,
        superAdminCompanies: state.superAdminCompanies,
      }),
    }
  )
);
