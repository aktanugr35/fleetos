'use client';

import { useAuthStore } from '@/store/authStore';

export function TenantSwitcher() {
  const user = useAuthStore((s) => s.user);
  const companies = useAuthStore((s) => s.superAdminCompanies);
  const tenantId = useAuthStore((s) => s.superAdminTenantId);
  const setSuperAdminTenantId = useAuthStore((s) => s.setSuperAdminTenantId);

  if (user?.role !== 'SUPER_ADMIN' || !companies?.length) {
    return null;
  }

  const current = companies.find((c) => c.id === tenantId);

  if (companies.length === 1) {
    return (
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs text-gray-400">
        <span className="text-gray-500 uppercase tracking-wide">Tenant</span>
        <span className="text-gray-200 font-medium truncate max-w-[10rem]">{current?.name ?? companies[0].name}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="fleetos-tenant" className="sr-only">
        Active company
      </label>
      <select
        id="fleetos-tenant"
        className="input py-1.5 text-sm max-w-[11rem] md:max-w-[14rem] bg-[var(--bg-primary)]"
        value={tenantId ?? ''}
        onChange={(e) => setSuperAdminTenantId(e.target.value || null)}
      >
        {!tenantId ? <option value="">Select company…</option> : null}
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
