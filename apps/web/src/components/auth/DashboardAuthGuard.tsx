'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { getAccessTokenFromStorage } from '@/lib/auth-cookies';
import api from '@/lib/api';

export function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setAuth, clearAuth, setSuperAdminTenantId, setSuperAdminCompanies } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const token = getAccessTokenFromStorage();

      if (!token) {
        clearAuth();
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        const me = res.data.data;
        if (cancelled) return;

        setAuth(
          {
            id: me.id,
            email: me.email,
            firstName: me.firstName,
            lastName: me.lastName,
            role: me.role,
            companyId: me.companyId,
          },
          token
        );

        if (me.role === 'SUPER_ADMIN') {
          try {
            const listRes = await api.get('/companies');
            const companies = listRes.data.data as { id: string; name: string; slug: string }[];
            setSuperAdminCompanies(companies);
            const ids = new Set(companies.map((c) => c.id));
            const persisted = useAuthStore.getState().superAdminTenantId;
            let nextTenant = persisted && ids.has(persisted) ? persisted : null;
            if (!nextTenant) {
              if (me.companyId && ids.has(me.companyId)) {
                nextTenant = me.companyId;
              } else if (companies.length === 1) {
                nextTenant = companies[0].id;
              } else {
                nextTenant = companies[0]?.id ?? null;
              }
            }
            setSuperAdminTenantId(nextTenant);
          } catch {
            setSuperAdminCompanies([]);
          }
        } else {
          setSuperAdminTenantId(null);
          setSuperAdminCompanies(null);
        }

        if (!cancelled) {
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          clearAuth();
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, setAuth, clearAuth, setSuperAdminTenantId, setSuperAdminCompanies]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
          <p className="text-sm text-gray-500">Verifying session…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
