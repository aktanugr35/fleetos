'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatCurrency } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api-errors';
import { logErrorDev } from '@/lib/logger';
import {
  fetchDriverSummary,
  formatMiles,
  formatWeekRange,
  ratePerMile,
  type DriverPortalSummary,
} from '@/lib/driver-portal';

/**
 * The hero sits on a fixed dark gradient, so its text uses literal colors rather than the
 * theme-remapped `text-white` utility, which flips to near-black under the light theme.
 */
function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-[#c7d6ec]">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-[#ffffff]">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--bg-secondary)] px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-2 py-3 text-center transition hover:border-[var(--border-hover)]"
    >
      <span className="text-[var(--brand-teal)]">{icon}</span>
      <span className="text-[11px] font-medium text-[var(--text-secondary)]">{label}</span>
    </Link>
  );
}

function formatRpm(grossCents: number, miles: number): string {
  const rpm = ratePerMile(grossCents, miles);
  return rpm == null ? '—' : `$${rpm.toFixed(2)}`;
}

export function DriverHomeView({ summary }: { summary: DriverPortalSummary }) {
  const { currentWeek, last4Weeks } = summary;

  return (
    <div className="dashboard-page space-y-4">
      <div>
        <p className="text-sm text-[var(--text-muted)]">Welcome back</p>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {summary.driver.firstName}
        </h1>
      </div>

      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0f2242] via-[#15355a] to-[#0d9488] p-5 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#c7d6ec]">
            This week
          </span>
          <span className="text-[11px] text-[#c7d6ec]">
            {formatWeekRange(currentWeek.weekStart, currentWeek.weekEnd)}
          </span>
        </div>

        <p className="mt-3 text-4xl font-bold tracking-tight text-[#ffffff]">
          {formatCurrency(currentWeek.grossCents)}
        </p>
        <p className="mt-1 text-xs text-[#c7d6ec]">
          {currentWeek.loadCount === 0
            ? 'No loads logged yet this week'
            : `Gross from ${currentWeek.loadCount} load${currentWeek.loadCount === 1 ? '' : 's'}`}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <HeroMetric label="Loads" value={String(currentWeek.loadCount)} />
          <HeroMetric label="Miles" value={formatMiles(currentWeek.totalMiles)} />
          <HeroMetric
            label="Avg RPM"
            value={formatRpm(currentWeek.grossCents, currentWeek.totalMiles)}
          />
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Last 4 weeks
          </span>
          <span className="text-[11px] text-[var(--text-muted)]">
            {formatWeekRange(last4Weeks.weekStart, last4Weeks.weekEnd)}
          </span>
        </div>

        <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          {formatCurrency(last4Weeks.grossCents)}
        </p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Gross from {last4Weeks.loadCount} load{last4Weeks.loadCount === 1 ? '' : 's'}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Metric label="Loads" value={String(last4Weeks.loadCount)} />
          <Metric label="Miles" value={formatMiles(last4Weeks.totalMiles)} />
          <Metric label="Avg RPM" value={formatRpm(last4Weeks.grossCents, last4Weeks.totalMiles)} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <QuickLink
          href="/dashboard/my-loads"
          label="Loads"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7h11v10H3z" /><path d="M14 10h4l3 3v4h-7z" />
              <circle cx="7" cy="18" r="1.5" /><circle cx="17" cy="18" r="1.5" />
            </svg>
          }
        />
        <QuickLink
          href="/dashboard/my-statements"
          label="Pay"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" />
            </svg>
          }
        />
        <QuickLink
          href="/dashboard/my-fuel"
          label="Fuel"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v15" /><path d="M3 20h11" />
              <path d="M4 10h9" /><path d="M17 8l3 3v6a1.5 1.5 0 0 1-3 0v-4h-4" />
            </svg>
          }
        />
        <QuickLink
          href="/dashboard/my-compliance"
          label="Documents"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5" /><path d="M9 13h6" /><path d="M9 17h4" />
            </svg>
          }
        />
      </div>
    </div>
  );
}

export function DriverHome() {
  const [summary, setSummary] = useState<DriverPortalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      setSummary(await fetchDriverSummary());
    } catch (err) {
      logErrorDev('driver-portal-summary', err);
      setError(getApiErrorMessage(err, 'Failed to load your week'));
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
        <div className="card">
          <LoadingBlock rows={5} />
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="dashboard-page">
        <ErrorState message={error || 'Failed to load your week'} onRetry={() => void load()} />
      </div>
    );
  }

  return <DriverHomeView summary={summary} />;
}
