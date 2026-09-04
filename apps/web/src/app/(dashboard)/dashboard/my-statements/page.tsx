'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api-errors';
import { logErrorDev } from '@/lib/logger';
import { fetchDriverStatements, type DriverStatements } from '@/lib/driver-portal';

function StatusBadge({ status }: { status: string }) {
  const style =
    status === 'PAID'
      ? 'bg-emerald-500/15 text-emerald-400'
      : 'bg-indigo-500/15 text-indigo-300';
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style}`}>
      {status === 'PAID' ? 'Paid' : 'Finalized'}
    </span>
  );
}

function Figure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p
        className={`mt-0.5 ${
          strong
            ? 'text-lg font-semibold text-[var(--text-primary)]'
            : 'font-medium text-[var(--text-secondary)]'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function MyStatementsPage() {
  const [data, setData] = useState<DriverStatements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await fetchDriverStatements());
    } catch (err) {
      logErrorDev('driver-portal-statements', err);
      setError(getApiErrorMessage(err, 'Failed to load your statements'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-page">
        <PageHeader title="My Pay" description="What you were paid, week by week" />
        <div className="card">
          <LoadingBlock rows={6} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="dashboard-page">
        <PageHeader title="My Pay" description="What you were paid, week by week" />
        <ErrorState message={error || 'Failed to load your statements'} onRetry={() => void load()} />
      </div>
    );
  }

  return (
    <div className="dashboard-page space-y-4">
      <PageHeader title="My Pay" description="What you were paid, week by week" />

      <div className="grid grid-cols-3 gap-2">
        <div className="card p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Last 4 weeks
          </p>
          <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
            {formatCurrency(data.totals.last4WeeksCents)}
          </p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Year to date
          </p>
          <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
            {formatCurrency(data.totals.ytdCents)}
          </p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            All time
          </p>
          <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
            {formatCurrency(data.totals.allTimeCents)}
          </p>
        </div>
      </div>

      {data.lastStatement ? (
        <div className="card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">Last statement</h3>
              <p className="text-xs text-[var(--text-muted)]">
                {formatDate(data.lastStatement.periodStart)} —{' '}
                {formatDate(data.lastStatement.periodEnd)}
                {data.lastStatement.statementNumber
                  ? ` · ${data.lastStatement.statementNumber}`
                  : ''}
              </p>
            </div>
            <StatusBadge status={data.lastStatement.status} />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Figure label="Gross" value={formatCurrency(data.lastStatement.grossCents)} />
            <Figure
              label="Deductions"
              value={`−${formatCurrency(data.lastStatement.deductionCents)}`}
            />
            <Figure
              label="Reimbursements"
              value={formatCurrency(data.lastStatement.creditCents)}
            />
            <Figure label="Net paid" value={formatCurrency(data.lastStatement.netCents)} strong />
          </div>
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            {data.lastStatement.loadCount} load
            {data.lastStatement.loadCount === 1 ? '' : 's'} on this statement
          </p>
        </div>
      ) : null}

      <div className="card p-0">
        <div className="border-b border-[var(--border-color)] px-4 py-3">
          <h3 className="font-semibold text-[var(--text-primary)]">Weekly statements</h3>
          <p className="text-xs text-[var(--text-muted)]">Finalized and paid</p>
        </div>
        {data.weeklyEarnings.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No statements yet"
              description="Your weekly settlements show up here once the office finalizes them."
            />
          </div>
        ) : (
          data.weeklyEarnings.map((item) => (
            <div
              key={item.settlementId}
              className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-color)] px-4 py-3 first:border-t-0"
            >
              <div>
                <p className="font-medium text-[var(--text-primary)]">
                  {formatDate(item.periodStart)} — {formatDate(item.periodEnd)}
                </p>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  {item.statementNumber || 'No statement number'}
                  <StatusBadge status={item.status} />
                </p>
              </div>
              <span className="font-semibold text-[var(--text-primary)]">
                {formatCurrency(item.netAmountCents)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
