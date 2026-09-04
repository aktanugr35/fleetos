'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatDate } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api-errors';
import { logErrorDev } from '@/lib/logger';
import {
  fetchDriverCompliance,
  type DriverCompliance,
  type DriverComplianceItem,
  type DriverComplianceStatus,
} from '@/lib/driver-portal';

const STATUS_STYLE: Record<DriverComplianceStatus, { label: string; badge: string; dot: string }> = {
  EXPIRED: { label: 'Expired', badge: 'bg-red-500/15 text-red-400', dot: 'bg-red-500' },
  DUE_SOON: { label: 'Due soon', badge: 'bg-amber-500/15 text-amber-400', dot: 'bg-amber-500' },
  MISSING: { label: 'Missing', badge: 'bg-slate-500/15 text-slate-400', dot: 'bg-slate-500' },
  VALID: { label: 'Valid', badge: 'bg-emerald-500/15 text-emerald-400', dot: 'bg-emerald-500' },
  NA: { label: 'Not tracked', badge: 'bg-slate-500/15 text-slate-400', dot: 'bg-slate-500' },
};

function remainingText(item: DriverComplianceItem): string {
  if (item.daysRemaining == null) return 'No date on file';
  if (item.daysRemaining < 0) {
    const days = Math.abs(item.daysRemaining);
    return `Expired ${days} day${days === 1 ? '' : 's'} ago`;
  }
  if (item.daysRemaining === 0) return 'Expires today';
  return `${item.daysRemaining} day${item.daysRemaining === 1 ? '' : 's'} left`;
}

function ComplianceRow({ item }: { item: DriverComplianceItem }) {
  const style = STATUS_STYLE[item.status];
  return (
    <div className="flex items-start gap-3 border-t border-[var(--border-color)] px-4 py-3 first:border-t-0">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-[var(--text-primary)]">{item.label}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
            {style.label}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          {item.category}
          {item.detail ? ` · ${item.detail}` : ''}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {item.expiryDate ? formatDate(item.expiryDate) : '—'}
        </p>
        <p className="text-[11px] text-[var(--text-muted)]">{remainingText(item)}</p>
      </div>
    </div>
  );
}

export default function MyCompliancePage() {
  const [data, setData] = useState<DriverCompliance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await fetchDriverCompliance());
    } catch (err) {
      logErrorDev('driver-portal-compliance', err);
      setError(getApiErrorMessage(err, 'Failed to load your documents'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const header = (
    <PageHeader title="My Documents" description="Your license and DOT expiry dates" />
  );

  if (loading) {
    return (
      <div className="dashboard-page">
        {header}
        <div className="card">
          <LoadingBlock rows={5} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="dashboard-page">
        {header}
        <ErrorState message={error || 'Failed to load your documents'} onRetry={() => void load()} />
      </div>
    );
  }

  const attention = data.items.filter(
    (item) => item.status === 'EXPIRED' || item.status === 'DUE_SOON',
  );

  return (
    <div className="dashboard-page space-y-4">
      {header}

      {attention.length > 0 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="text-sm font-semibold text-amber-400">
            {attention.length} item{attention.length === 1 ? '' : 's'} need attention
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            Contact the office to get these renewed — you cannot update them here.
          </p>
        </div>
      ) : null}

      <div className="card p-0">
        {data.items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="Nothing on file"
              description="Your compliance dates will appear here once the office adds them."
            />
          </div>
        ) : (
          data.items.map((item) => <ComplianceRow key={item.key} item={item} />)
        )}
      </div>

      <p className="px-1 text-xs text-[var(--text-muted)]">
        This page is read-only. Ask dispatch or the office to correct anything that looks wrong.
      </p>
    </div>
  );
}
