'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { clearLegacyAccessTokenStorage } from '@/lib/auth-cookies';
import api from '@/lib/api';

export function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const { setAuth, clearAuth, setSuperAdminTenantId, setSuperAdminCompanies } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [unreachable, setUnreachable] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const rejectToLogin = async () => {
      try {
        await api.post('/auth/logout');
      } catch {
        // cookies may already be invalid
      }
      clearAuth();
      if (cancelled) return;
      const redirect = encodeURIComponent(window.location.pathname || '/dashboard');
      window.location.replace(`/login?redirect=${redirect}`);
    };

    const verify = async () => {
      clearLegacyAccessTokenStorage();
      try {
        const res = await api.get('/auth/me', { timeout: 12000 });
        const me = res.data.data;
        if (cancelled) return;

        setAuth({
          id: me.id,
          email: me.email,
          firstName: me.firstName,
          lastName: me.lastName,
          role: me.role,
          companyId: me.companyId,
        });

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
      } catch (err) {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403) {
          await rejectToLogin();
          return;
        }
        // Server restarting or network blip: keep the session and let the user retry.
        setUnreachable(true);
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [setAuth, clearAuth, setSuperAdminTenantId, setSuperAdminCompanies, attempt]);

  if (unreachable && !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-gray-400">Could not reach the server. Your session is still active.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setUnreachable(false);
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

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
