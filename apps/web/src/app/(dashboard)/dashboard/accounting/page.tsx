'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { AccountingEntriesTab } from '@/components/accounting/AccountingEntriesTab';
import { ProfitLossOverview } from '@/components/accounting/ProfitLossOverview';
import { Toast } from '@/components/ui/Toast';
import { usePermission } from '@/hooks/usePermission';
import { getApiErrorMessage } from '@/lib/api-errors';
import type { ProfitAndLoss } from '@/lib/accounting';
import api from '@/lib/api';

type Tab = 'overview' | 'expenses' | 'income';
type Preset = 'mtd' | '90d' | '6m' | '12m' | 'ytd';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Profit & loss' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'income', label: 'Other income' },
];

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'mtd', label: 'This month' },
  { id: '90d', label: '3 months' },
  { id: '6m', label: '6 months' },
  { id: '12m', label: '12 months' },
  { id: 'ytd', label: 'Year to date' },
];

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
        active ? 'bg-[var(--brand-amber)] text-[#1a1206]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      {children}
    </button>
  );
}

export default function AccountingPage() {
  const { can } = usePermission();
  const allowed = can('accounting:view');
  const canWrite = can('accounting:write');

  const [tab, setTab] = useState<Tab>('overview');
  const [preset, setPreset] = useState<Preset>('ytd');
  const [summary, setSummary] = useState<ProfitAndLoss | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showError = useCallback((message: string) => setToast({ type: 'error', message }), []);

  const fetchSummary = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    try {
      const res = await api.get('/accounting/summary', { params: { preset } });
      setSummary(res.data.data);
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not load profit & loss'));
    } finally {
      setLoading(false);
    }
  }, [allowed, preset, showError]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  if (!allowed) {
    return (
      <div>
        <PageHeader title="Accounting" />
        <div className="card max-w-md py-12 text-center">
          <p className="mb-4 text-sm text-[var(--text-secondary)]">You do not have access to accounting.</p>
          <Link href="/dashboard" className="btn btn-secondary text-sm">
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Accounting"
        description="Company income, expenses and profit. Load revenue, driver and dispatcher pay, fuel, tolls and factoring fees are filled in automatically."
      />

      <div className="mb-5 inline-flex rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-0.5">
        {TABS.map((t) => (
          <TabButton key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </TabButton>
        ))}
      </div>

      {tab === 'overview' ? (
        <div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  preset === p.id
                    ? 'border-[var(--brand-amber)] bg-[var(--brand-amber)]/15 text-[var(--brand-amber)]'
                    : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {loading && !summary ? (
            <div className="card text-sm text-[var(--text-muted)]">Loading...</div>
          ) : summary ? (
            <div className={loading ? 'opacity-60 transition' : 'transition'}>
              <ProfitLossOverview data={summary} />
            </div>
          ) : null}
        </div>
      ) : (
        <AccountingEntriesTab
          key={tab}
          kind={tab === 'income' ? 'INCOME' : 'EXPENSE'}
          canWrite={canWrite}
          onChanged={() => void fetchSummary()}
          onError={showError}
        />
      )}

      {toast ? <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
