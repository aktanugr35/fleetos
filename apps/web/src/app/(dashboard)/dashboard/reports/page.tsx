'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Toast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api-errors';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/api';

type ReportPreset = '30d' | '90d' | '6m' | '12m' | 'ytd';
type ReportTab = 'overview' | 'drivers' | 'brokers';

interface OperationalAnalyticsResponse {
  range: { from: string; to: string };
  preset: ReportPreset | null;
  basis: string;
  company: {
    totalLoads: number;
    byStatus: Record<string, number>;
    deliveredLoads: number;
    grossRevenueDeliveredCents: number;
    totalMiles: number;
    loadedMiles: number;
    deadheadMiles: number;
    driversWithLoads: number;
    totalDriverWorkDays: number;
    fleetActiveCalendarDays: number;
  };
  revenueByMonth: { monthKey: string; label: string; revenueCents: number }[];
  drivers: {
    driverId: string;
    firstName: string;
    lastName: string;
    driverType: string;
    totalLoads: number;
    deliveredLoads: number;
    cancelledLoads: number;
    tonuLoads: number;
    pendingOrTransitLoads: number;
    workDays: number;
    totalMiles: number;
    loadedMiles: number;
    deadheadMiles: number;
    grossRevenueDeliveredCents: number;
  }[];
  brokers: {
    brokerName: string;
    totalLoads: number;
    deliveredLoads: number;
    grossRevenueDeliveredCents: number;
    totalMiles: number;
    loadedMiles: number;
    deadheadMiles: number;
  }[];
}

const PRESETS: { id: ReportPreset; label: string; hint: string }[] = [
  { id: '30d', label: '30 days', hint: 'Rolling window, UTC' },
  { id: '90d', label: '90 days', hint: 'Default' },
  { id: '6m', label: '~6 months', hint: '183 days' },
  { id: '12m', label: '~1 year', hint: '365 days' },
  { id: 'ytd', label: 'Year to date', hint: 'Jan 1 → today (UTC)' },
];

function utcDateLabel(iso: string): string {
  return iso.slice(0, 10);
}

function DriverTypePill({ type }: { type: string }) {
  const isOO = type === 'OWNER_OPERATOR';
  return (
    <span
      className={`text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-md border ${
        isOO
          ? 'bg-purple-500/10 text-purple-600 border-purple-500/25 dark:text-purple-300'
          : 'bg-blue-500/10 text-blue-700 border-blue-500/25 dark:text-blue-300'
      }`}
    >
      {isOO ? 'Owner-op' : 'Company'}
    </span>
  );
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  IN_TRANSIT: 'In transit',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  TONU: 'TONU',
};

export default function ReportsPage() {
  const { can } = usePermission();
  const allowed = can('reports:view');

  const [tab, setTab] = useState<ReportTab>('overview');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OperationalAnalyticsResponse | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [preset, setPreset] = useState<ReportPreset>('90d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const fetchAnalytics = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (mode === 'custom' && customFrom && customTo) {
        params.set('from', customFrom);
        params.set('to', customTo);
      } else {
        params.set('preset', preset);
      }
      const res = await api.get(`/reports/operational-analytics?${params.toString()}`);
      setData(res.data.data);
    } catch (err) {
      setToast({ type: 'error', message: getApiErrorMessage(err, 'Could not load reports') });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [allowed, mode, preset, customFrom, customTo]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const maxMonthRev = useMemo(() => {
    const arr = data?.revenueByMonth ?? [];
    return Math.max(1, ...arr.map((m) => m.revenueCents));
  }, [data]);

  if (!allowed) {
    return (
      <div>
        <PageHeader title="Reports" description="Operational analytics" />
        <div className="card max-w-md py-12 text-center">
          <p className="text-sm text-[var(--text-secondary)] mb-4">You do not have access to reports.</p>
          <Link href="/dashboard/loads" className="btn btn-secondary text-sm">
            Go to loads
          </Link>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div>
        <PageHeader title="Reports" description="Operational analytics" />
        <div className="flex justify-center py-24">
          <div className="animate-spin w-9 h-9 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  const c = data?.company;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <PageHeader title="Reports" description="Loads, revenue, and miles for the period you choose." />

      {/* Period */}
      <section className="card space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">1 · Pick a period</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">Dates are UTC. Loads are counted by pickup date in the range.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={loading}
              onClick={() => {
                setMode('preset');
                setPreset(p.id);
              }}
              title={p.hint}
              className={`min-w-[5.5rem] px-4 py-2.5 rounded-xl text-sm font-medium border transition ${
                mode === 'preset' && preset === p.id
                  ? 'border-blue-500 bg-blue-500 text-white shadow-sm'
                  : 'border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 space-y-3">
          <p className="text-xs font-medium text-[var(--text-secondary)]">Or choose exact dates</p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              className="input py-2 text-sm w-auto min-w-[10rem]"
              value={customFrom}
              onChange={(e) => {
                setCustomFrom(e.target.value);
                setMode('custom');
              }}
            />
            <span className="text-[var(--text-muted)] text-sm">to</span>
            <input
              type="date"
              className="input py-2 text-sm w-auto min-w-[10rem]"
              value={customTo}
              onChange={(e) => {
                setCustomTo(e.target.value);
                setMode('custom');
              }}
            />
            <button
              type="button"
              disabled={loading || !customFrom || !customTo}
              onClick={() => void fetchAnalytics()}
              className="btn btn-primary text-sm py-2"
            >
              Apply range
            </button>
          </div>
        </div>

        {data ? (
          <p className="text-xs text-[var(--text-muted)]">
            Active range:{' '}
            <span className="font-mono text-[var(--text-primary)]">
              {utcDateLabel(data.range.from)} — {utcDateLabel(data.range.to)}
            </span>
            {data.preset ? <span className="ml-2">({data.preset})</span> : <span className="ml-2">(custom)</span>}
          </p>
        ) : null}
        <p className="text-[11px] leading-relaxed text-[var(--text-muted)] border-t border-[var(--border-color)] pt-3">{data?.basis}</p>
      </section>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--border-color)] pb-1">
        {(
          [
            ['overview', 'Overview'],
            ['drivers', 'Drivers'],
            ['brokers', 'Brokers'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition ${
              tab === id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Company snapshot</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card py-5">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Loads</p>
              <p className="text-3xl font-bold text-[var(--text-primary)] mt-1 tabular-nums">{c?.totalLoads ?? 0}</p>
              <p className="text-xs text-[var(--text-muted)] mt-2">Pickups in range</p>
            </div>
            <div className="card py-5">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Delivered</p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">{c?.deliveredLoads ?? 0}</p>
              <p className="text-xs text-[var(--text-muted)] mt-2">Completed loads</p>
            </div>
            <div className="card py-5">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Gross revenue</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1 tabular-nums">
                {formatCurrency(c?.grossRevenueDeliveredCents ?? 0)}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-2">Delivered only · line haul + extras</p>
            </div>
            <div className="card py-5">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Fleet days</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-300 mt-1 tabular-nums">{c?.fleetActiveCalendarDays ?? 0}</p>
              <p className="text-xs text-[var(--text-muted)] mt-2">Days with at least one pickup</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Load status</h3>
              <div className="flex flex-wrap gap-2">
                {c &&
                  Object.entries(c.byStatus).map(([k, v]) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-sm"
                    >
                      <span className="text-[var(--text-secondary)]">{STATUS_LABELS[k] ?? k}</span>
                      <span className="font-semibold tabular-nums text-[var(--text-primary)]">{v}</span>
                    </span>
                  ))}
                {c && Object.keys(c.byStatus).length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No loads in this range.</p>
                ) : null}
              </div>
            </div>
            <div className="card">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Miles &amp; drivers</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--text-muted)]">Total miles</dt>
                  <dd className="font-medium tabular-nums text-[var(--text-primary)]">{(c?.totalMiles ?? 0).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--text-muted)]">Loaded / deadhead</dt>
                  <dd className="font-medium tabular-nums text-[var(--text-primary)]">
                    {(c?.loadedMiles ?? 0).toLocaleString()} / {(c?.deadheadMiles ?? 0).toLocaleString()}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--text-muted)]" title="Sum of each driver’s distinct pickup days">
                    Driver work-days
                  </dt>
                  <dd className="font-medium tabular-nums text-[var(--text-primary)]">{c?.totalDriverWorkDays ?? 0}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--text-muted)]">Drivers with loads</dt>
                  <dd className="font-medium tabular-nums text-[var(--text-primary)]">{c?.driversWithLoads ?? 0}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Delivered gross by pickup month</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">Hover a bar for the exact amount.</p>
            {!data?.revenueByMonth.length ? (
              <p className="text-sm text-[var(--text-muted)] py-8 text-center">No delivered revenue in this range.</p>
            ) : (
              <div className="flex items-end gap-2 h-52 px-1">
                {data.revenueByMonth.map((row, i) => {
                  const h = (row.revenueCents / maxMonthRev) * 100;
                  const last = i === data.revenueByMonth.length - 1;
                  return (
                    <div key={row.monthKey} className="flex-1 flex flex-col items-center gap-1 min-w-0 group/bar">
                      <div className="text-[10px] text-[var(--text-muted)] opacity-0 group-hover/bar:opacity-100 transition truncate max-w-full">
                        {formatCurrency(row.revenueCents)}
                      </div>
                      <div
                        className={`w-full max-w-[3rem] mx-auto rounded-t-md transition ${
                          last ? 'bg-blue-600' : 'bg-blue-500/50 dark:bg-blue-500/40'
                        }`}
                        style={{ height: `${Math.max(4, h)}%` }}
                      />
                      <div className="text-[10px] text-[var(--text-muted)] truncate max-w-full text-center">{row.label}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'drivers' && (
        <div className="space-y-3 animate-fade-in">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Driver performance</h2>
          <p className="text-sm text-[var(--text-muted)]">
            <strong>Work days</strong> = distinct UTC calendar days with a pickup for that driver. Revenue = delivered loads only.
          </p>
          <div className="card p-0 overflow-hidden border border-[var(--border-color)]">
            <div className="overflow-x-auto">
              <table className="data-table text-sm">
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Type</th>
                    <th className="text-right">Work days</th>
                    <th className="text-right">Loads</th>
                    <th className="text-right">Delivered</th>
                    <th className="text-right">Cancelled</th>
                    <th className="text-right">TONU</th>
                    <th className="text-right">Pending / transit</th>
                    <th className="text-right">Miles</th>
                    <th className="text-right">Gross</th>
                  </tr>
                </thead>
                <tbody>
                  {!data?.drivers.length ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-[var(--text-muted)]">
                        No driver loads in this range.
                      </td>
                    </tr>
                  ) : (
                    data.drivers.map((d) => (
                      <tr key={d.driverId}>
                        <td>
                          <Link
                            href={`/dashboard/drivers/${d.driverId}`}
                            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {d.firstName} {d.lastName}
                          </Link>
                        </td>
                        <td>
                          <DriverTypePill type={d.driverType} />
                        </td>
                        <td className="text-right tabular-nums text-amber-700 dark:text-amber-200">{d.workDays}</td>
                        <td className="text-right tabular-nums">{d.totalLoads}</td>
                        <td className="text-right tabular-nums text-emerald-700 dark:text-emerald-300">{d.deliveredLoads}</td>
                        <td className="text-right tabular-nums text-[var(--text-muted)]">{d.cancelledLoads}</td>
                        <td className="text-right tabular-nums text-[var(--text-muted)]">{d.tonuLoads}</td>
                        <td className="text-right tabular-nums text-[var(--text-muted)]">{d.pendingOrTransitLoads}</td>
                        <td className="text-right tabular-nums">{d.totalMiles.toLocaleString()}</td>
                        <td className="text-right font-medium tabular-nums">{formatCurrency(d.grossRevenueDeliveredCents)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'brokers' && (
        <div className="space-y-3 animate-fade-in">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Broker performance</h2>
          <p className="text-sm text-[var(--text-muted)]">Same pickup window. Gross = delivered loads only.</p>
          <div className="card p-0 overflow-hidden border border-[var(--border-color)]">
            <div className="overflow-x-auto">
              <table className="data-table text-sm">
                <thead>
                  <tr>
                    <th>Broker</th>
                    <th className="text-right">Loads</th>
                    <th className="text-right">Delivered</th>
                    <th className="text-right">Miles</th>
                    <th className="text-right">Loaded</th>
                    <th className="text-right">Deadhead</th>
                    <th className="text-right">Gross</th>
                  </tr>
                </thead>
                <tbody>
                  {!data?.brokers.length ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-[var(--text-muted)]">
                        No broker data in this range.
                      </td>
                    </tr>
                  ) : (
                    data.brokers.map((b) => (
                      <tr key={b.brokerName}>
                        <td className="font-medium text-[var(--text-primary)] max-w-[14rem] truncate">{b.brokerName}</td>
                        <td className="text-right tabular-nums">{b.totalLoads}</td>
                        <td className="text-right tabular-nums text-emerald-700 dark:text-emerald-300">{b.deliveredLoads}</td>
                        <td className="text-right tabular-nums">{b.totalMiles.toLocaleString()}</td>
                        <td className="text-right tabular-nums text-[var(--text-muted)]">{b.loadedMiles.toLocaleString()}</td>
                        <td className="text-right tabular-nums text-[var(--text-muted)]">{b.deadheadMiles.toLocaleString()}</td>
                        <td className="text-right font-medium tabular-nums">{formatCurrency(b.grossRevenueDeliveredCents)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/settlements" className="btn btn-secondary text-sm">
          Settlements
        </Link>
        <Link href="/dashboard/compliance" className="btn btn-secondary text-sm">
          Compliance
        </Link>
        <Link href="/dashboard/loads" className="btn btn-secondary text-sm">
          All loads
        </Link>
      </div>

      {loading && data ? (
        <div className="fixed bottom-6 right-6 text-xs text-[var(--text-muted)] bg-[var(--bg-card)] px-3 py-2 rounded-lg border border-[var(--border-color)] shadow-lg">
          Updating…
        </div>
      ) : null}

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
