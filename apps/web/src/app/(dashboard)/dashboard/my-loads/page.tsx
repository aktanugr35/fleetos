'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api-errors';
import { logErrorDev } from '@/lib/logger';
import {
  WEEK_RANGE_OPTIONS,
  fetchDriverLoadWeeks,
  formatMiles,
  formatWeekRange,
  type DriverLoad,
  type DriverLoadWeek,
} from '@/lib/driver-portal';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  TONU: 'TONU',
};

function LoadCard({ load }: { load: DriverLoad }) {
  const extraStops = load.stops.length > 2 ? load.stops.length - 2 : 0;
  const workDate = load.actualDeliveryDate || load.deliveryDate || load.pickupDate;

  return (
    <div className="border-t border-[var(--border-color)] px-4 py-3 first:border-t-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-semibold text-[var(--brand-teal)]">{load.loadNumber}</span>
        <span className="text-xs text-[var(--text-muted)]">
          {STATUS_LABEL[load.status] || load.status}
        </span>
        {load.paid ? (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            Paid{load.statementNumber ? ` · ${load.statementNumber}` : ''}
          </span>
        ) : (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
            Not paid yet
          </span>
        )}
      </div>

      <p className="mt-1 font-medium text-[var(--text-primary)]">
        {load.pickupLocation} → {load.deliveryLocation}
        {extraStops > 0 ? (
          <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
            +{extraStops} stop{extraStops === 1 ? '' : 's'}
          </span>
        ) : null}
      </p>

      {load.stops.length > 0 ? (
        <ol className="mt-2 space-y-1 border-l border-[var(--border-color)] pl-3">
          {load.stops.map((stop) => (
            <li key={stop.sequence} className="text-xs text-[var(--text-secondary)]">
              <span className="text-[var(--text-muted)]">
                {stop.type === 'PICKUP' ? 'Pickup' : 'Delivery'} {stop.sequence}:
              </span>{' '}
              {stop.address ? `${stop.address}, ` : ''}
              {stop.location}
              {stop.scheduledAt ? ` · ${formatDate(stop.scheduledAt)}` : ''}
            </li>
          ))}
        </ol>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-[var(--text-muted)]">
          {formatDate(workDate)} · {formatMiles(load.totalMiles)} mi
          {load.deadheadMiles > 0 ? ` (${formatMiles(load.deadheadMiles)} deadhead)` : ''}
        </span>
        <span className="font-semibold text-[var(--text-primary)]">
          {formatCurrency(load.grossCents)}
        </span>
      </div>
    </div>
  );
}

function WeekCard({ week }: { week: DriverLoadWeek }) {
  return (
    <div className="card p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] px-4 py-3">
        <div>
          <p className="font-semibold text-[var(--text-primary)]">
            {formatWeekRange(week.weekStart, week.weekEnd)}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {week.loadCount} load{week.loadCount === 1 ? '' : 's'} ·{' '}
            {formatMiles(week.totalMiles)} mi
            {week.paidLoadCount < week.loadCount
              ? ` · ${week.loadCount - week.paidLoadCount} awaiting payout`
              : ''}
          </p>
        </div>
        <span className="text-lg font-semibold text-[var(--text-primary)]">
          {formatCurrency(week.grossCents)}
        </span>
      </div>
      {week.loads.map((load) => (
        <LoadCard key={load.id} load={load} />
      ))}
    </div>
  );
}

export default function MyLoadsPage() {
  const [weeks, setWeeks] = useState<DriverLoadWeek[]>([]);
  const [range, setRange] = useState(8);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (weekCount: number) => {
    try {
      setLoading(true);
      setError(null);
      setWeeks(await fetchDriverLoadWeeks(weekCount));
    } catch (err) {
      logErrorDev('driver-portal-loads', err);
      setError(getApiErrorMessage(err, 'Failed to load your loads'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(range);
  }, [range]);

  return (
    <div className="dashboard-page space-y-4">
      <PageHeader title="My Loads" description="Everything you hauled, grouped by week" />

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
          title="No loads in this period"
          description="Loads show up here as soon as dispatch assigns them to you."
        />
      ) : (
        weeks.map((week) => <WeekCard key={week.weekStart} week={week} />)
      )}
    </div>
  );
}
