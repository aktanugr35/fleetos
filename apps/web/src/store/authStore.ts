'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  isAuthenticated: boolean;
  /** Active tenant for SUPER_ADMIN API calls (?tenantId=); ignored for other roles */
  superAdminTenantId: string | null;
  superAdminCompanies: SuperAdminCompanyOption[] | null;

  setAuth: (user: AuthUser) => void;
  clearAuth: () => void;
  setSuperAdminTenantId: (id: string | null) => void;
  setSuperAdminCompanies: (companies: SuperAdminCompanyOption[] | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      superAdminTenantId: null,
      superAdminCompanies: null,

      setAuth: (user) => {
        set((state) => {
          const sameUser = state.user?.id === user.id;
          return {
            user,
            isAuthenticated: true,
            superAdminTenantId: sameUser ? state.superAdminTenantId : null,
            superAdminCompanies: sameUser ? state.superAdminCompanies : null,
          };
        });
      },

      clearAuth: () => {
        set({
          user: null,
          isAuthenticated: false,
          superAdminTenantId: null,
          superAdminCompanies: null,
        });
      },

      setSuperAdminTenantId: (id) => set({ superAdminTenantId: id }),

      setSuperAdminCompanies: (companies) => set({ superAdminCompanies: companies }),
    }),
    {
      name: 'haulyard-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        superAdminTenantId: state.superAdminTenantId,
        superAdminCompanies: state.superAdminCompanies,
      }),
    }
  )
);
