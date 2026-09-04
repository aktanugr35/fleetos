'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api-errors';
import { logErrorDev } from '@/lib/logger';
import {
  WEEK_RANGE_OPTIONS,
  fetchDriverFuelWeeks,
  formatWeekRange,
  type DriverFuelWeek,
} from '@/lib/driver-portal';

function formatGallons(gallons: number): string {
  return `${gallons.toLocaleString(undefined, { maximumFractionDigits: 1 })} gal`;
}

function WeekCard({ week }: { week: DriverFuelWeek }) {
  return (
    <div className="card p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] px-4 py-3">
        <div>
          <p className="font-semibold text-[var(--text-primary)]">
            {formatWeekRange(week.weekStart, week.weekEnd)}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {week.entries.length} fill-up{week.entries.length === 1 ? '' : 's'} ·{' '}
            {formatGallons(week.gallons)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-[var(--text-primary)]">
            {formatCurrency(week.netCents)}
          </p>
          {week.discountCents > 0 ? (
            <p className="text-xs text-emerald-400">
              {formatCurrency(week.discountCents)} saved
            </p>
          ) : null}
        </div>
      </div>

      {week.entries.map((entry) => (
        <div
          key={entry.id}
          className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-color)] px-4 py-3 first:border-t-0"
        >
          <div className="min-w-0">
            <p className="font-medium text-[var(--text-primary)]">
              {entry.merchant || 'Fuel purchase'}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {formatDate(entry.date)} · Unit {entry.truckUnitNumber}
              {entry.gallons ? ` · ${formatGallons(entry.gallons)}` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-[var(--text-primary)]">
              {formatCurrency(entry.netCents)}
            </p>
            {entry.discountCents > 0 ? (
              <p className="text-xs text-emerald-400">−{formatCurrency(entry.discountCents)}</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MyFuelPage() {
  const [weeks, setWeeks] = useState<DriverFuelWeek[]>([]);
  const [range, setRange] = useState(8);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(
    () =>
      weeks.reduce(
        (acc, week) => ({
          gallons: acc.gallons + week.gallons,
          netCents: acc.netCents + week.netCents,
          discountCents: acc.discountCents + week.discountCents,
        }),
        { gallons: 0, netCents: 0, discountCents: 0 },
      ),
    [weeks],
  );

  const load = async (weekCount: number) => {
    try {
      setLoading(true);
      setError(null);
      setWeeks(await fetchDriverFuelWeeks(weekCount));
    } catch (err) {
      logErrorDev('driver-portal-fuel', err);
      setError(getApiErrorMessage(err, 'Failed to load your fuel purchases'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(range);
  }, [range]);

  return (
    <div className="dashboard-page space-y-4">
      <PageHeader title="My Fuel" description="Fuel bought with the truck you were running" />

      <div className="flex flex-wrap gap-1.5">
        {WEEK_RANGE_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setRange(option)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
              range === option
                ? 'border-[var(--brand-amber)] bg-[color-mix(in_srgb,var(--brand-amber)_15%,transparent)] text-[var(--brand-amber)]'
                : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            Last {option} weeks
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card">
          <LoadingBlock rows={6} />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load(range)} />
      ) : weeks.length === 0 ? (
        <EmptyState
          title="No fuel purchases yet"
          description="Fill-ups made with your truck's fuel card will show up here."
        />
      ) : (
        <>
          <div className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                Last {range} weeks
              </p>
              <p className="text-2xl font-semibold text-[var(--text-primary)]">
                {formatCurrency(totals.netCents)}
              </p>
            </div>
            <div className="text-right text-sm text-[var(--text-secondary)]">
              <p>{formatGallons(totals.gallons)}</p>
              {totals.discountCents > 0 ? (
                <p className="text-emerald-400">
                  {formatCurrency(totals.discountCents)} in discounts
                </p>
              ) : null}
            </div>
          </div>
          {weeks.map((week) => (
            <WeekCard key={week.weekStart} week={week} />
          ))}
        </>
      )}
    </div>
  );
}
