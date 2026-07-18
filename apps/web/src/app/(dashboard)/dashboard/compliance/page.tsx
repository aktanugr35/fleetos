'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { getApiErrorMessage } from '@/lib/api-errors';
import { logErrorDev } from '@/lib/logger';
import { formatDate } from '@/lib/utils';
import api from '@/lib/api';
import {
  type ComplianceItem,
  type ComplianceOverview,
  type ComplianceEntityType,
  type ComplianceStatus,
  STATUS_META,
  ENTITY_TABS,
  dueLabel,
  scoreColor,
} from '@/lib/compliance';
import { RenewModal } from '@/components/compliance/RenewModal';
import { EntityProfileModal } from '@/components/compliance/EntityProfileModal';
import { ComplianceSettingsModal } from '@/components/compliance/ComplianceSettingsModal';

type View = 'overview' | 'requirements' | 'calendar';

function StatusChip({ status, days }: { status: ComplianceStatus; days: number | null }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.chip}`}
    >
      {(status === 'EXPIRED' || status === 'DUE_SOON') && (
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} ${status === 'EXPIRED' ? 'animate-pulse' : ''}`} />
      )}
      {dueLabel({ status, daysRemaining: days })}
    </span>
  );
}

// ─── Overview ─────────────────────────────────────────
function OverviewView({
  data,
  onJump,
}: {
  data: ComplianceOverview;
  onJump: (status: ComplianceStatus | 'all') => void;
}) {
  const { summary } = data;
  const kpis: { key: ComplianceStatus | 'all'; label: string; value: number; text: string }[] = [
    { key: 'EXPIRED', label: 'Expired', value: summary.expired, text: 'text-red-500' },
    { key: 'DUE_SOON', label: 'Due soon (<30d)', value: summary.dueSoon, text: 'text-amber-500' },
    { key: 'MISSING', label: 'Missing', value: summary.missing, text: 'text-slate-400' },
    { key: 'VALID', label: 'Valid', value: summary.valid, text: 'text-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Score */}
        <div className="card flex items-center gap-5">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
            <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="var(--border-color)"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${summary.score}, 100`}
                strokeLinecap="round"
                className={scoreColor(summary.score)}
              />
            </svg>
            <span className={`absolute text-2xl font-bold ${scoreColor(summary.score)}`}>
              {summary.score}%
            </span>
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">Compliance score</div>
            <div className="mt-0.5 text-xs text-[var(--text-muted)]">
              {summary.valid} of {summary.total} requirements valid
            </div>
            <div className="mt-2 text-xs text-[var(--text-secondary)]">
              {summary.dueWithin60} due within 60 days
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          {kpis.map((k) => (
            <button
              key={k.key}
              onClick={() => onJump(k.key)}
              className="card text-left transition hover:border-[var(--brand-amber)]"
            >
              <div className={`text-3xl font-bold ${k.text}`}>{k.value}</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">{k.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Category breakdown */}
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">By category</h3>
          <div className="space-y-2.5">
            {data.categories.map((c) => {
              const pct = c.total ? Math.round(((c.total - c.issues) / c.total) * 100) : 100;
              return (
                <div key={c.category}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">{c.category}</span>
                    <span className="text-[var(--text-muted)]">
                      {c.issues > 0 ? `${c.issues} issue(s)` : 'All clear'}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                    <div
                      className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {data.categories.length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">No requirements tracked yet.</p>
            )}
          </div>
        </div>

        {/* Upcoming */}
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Needs attention</h3>
          <div className="space-y-1.5">
            {data.upcoming.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">Nothing due right now. 🎉</p>
            ) : (
              data.upcoming.map((item) => (
                <div key={item.id} className="flex items-center gap-2.5 text-sm">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_META[item.status].dot}`} />
                  <span className="min-w-0 flex-1 truncate text-[var(--text-secondary)]">
                    <span className="font-medium text-[var(--text-primary)]">{item.entityName}</span>
                    {' — '}
                    {item.typeLabel}
                  </span>
                  <span className={`shrink-0 text-xs font-medium ${STATUS_META[item.status].text}`}>
                    {dueLabel(item)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar ─────────────────────────────────────────
function CalendarView({ items }: { items: ComplianceItem[] }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const base = new Date();
  base.setMonth(base.getMonth() + monthOffset);
  const year = base.getFullYear();
  const month = base.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDay = useMemo(() => {
    const map = new Map<number, ComplianceItem[]>();
    for (const item of items) {
      if (!item.effectiveDate) continue;
      const d = new Date(item.effectiveDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const list = map.get(d.getDate()) ?? [];
        list.push(item);
        map.set(d.getDate(), list);
      }
    }
    return map;
  }, [items, year, month]);

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          {base.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex gap-1">
          <button onClick={() => setMonthOffset((m) => m - 1)} className="btn-secondary px-2 py-1 text-xs">
            ‹ Prev
          </button>
          <button onClick={() => setMonthOffset(0)} className="btn-secondary px-2 py-1 text-xs">
            Today
          </button>
          <button onClick={() => setMonthOffset((m) => m + 1)} className="btn-secondary px-2 py-1 text-xs">
            Next ›
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          const dayItems = day ? byDay.get(day) ?? [] : [];
          const hasExpired = dayItems.some((x) => x.status === 'EXPIRED');
          const hasDue = dayItems.some((x) => x.status === 'DUE_SOON');
          return (
            <div
              key={i}
              className={`min-h-[64px] rounded-lg border border-[var(--border-color)] p-1.5 ${
                day ? 'bg-[var(--bg-secondary)]' : 'bg-transparent border-transparent'
              }`}
            >
              {day && (
                <>
                  <div className="text-xs text-[var(--text-muted)]">{day}</div>
                  {dayItems.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      title={`${item.entityName} — ${item.typeLabel}`}
                      className={`mt-0.5 truncate rounded px-1 py-0.5 text-[10px] ${
                        hasExpired
                          ? 'bg-red-500/15 text-red-500'
                          : hasDue
                            ? 'bg-amber-500/15 text-amber-600'
                            : 'bg-emerald-500/15 text-emerald-600'
                      }`}
                    >
                      {item.entityName}
                    </div>
                  ))}
                  {dayItems.length > 3 && (
                    <div className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                      +{dayItems.length - 3} more
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────
export default function CompliancePage() {
  const [view, setView] = useState<View>('overview');
  const [overview, setOverview] = useState<ComplianceOverview | null>(null);
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<ComplianceEntityType>('DRIVER');
  const [status, setStatus] = useState<ComplianceStatus | ''>('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [renewing, setRenewing] = useState<ComplianceItem | null>(null);
  const [profile, setProfile] = useState<ComplianceItem | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadOverview = useCallback(async () => {
    try {
      const res = await api.get('/compliance/overview');
      setOverview(res.data.data);
    } catch (err) {
      logErrorDev('compliance-overview', err);
      setError(getApiErrorMessage(err, 'Failed to load compliance data'));
    }
  }, []);

  const loadItems = useCallback(async () => {
    try {
      const params: Record<string, string | number> = { entityType: tab, page, limit: 50 };
      if (status) params.status = status;
      if (category) params.category = category;
      if (search) params.search = search;
      const res = await api.get('/compliance/items', { params });
      setItems(res.data.data.items);
      setTotal(res.data.data.total);
      setTotalPages(res.data.data.totalPages);
    } catch (err) {
      logErrorDev('compliance-items', err);
      setError(getApiErrorMessage(err, 'Failed to load compliance data'));
    }
  }, [tab, status, category, search, page]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([loadOverview(), loadItems()]);
    setLoading(false);
  }, [loadOverview, loadItems]);

  useEffect(() => {
    void refresh();
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, status, category, search, page]);

  const categories = useMemo(
    () => Array.from(new Set(overview?.categories.map((c) => c.category) ?? [])),
    [overview],
  );

  const jumpToRequirements = (s: ComplianceStatus | 'all') => {
    setStatus(s === 'all' ? '' : s);
    setPage(1);
    setView('requirements');
  };

  const toggleSelect = (id: string) => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportCsv = () => {
    const rows = items.filter((i) => selected.size === 0 || selected.has(i.id));
    const header = ['Entity', 'Requirement', 'Category', 'Status', 'Due date', 'Reference'];
    const body = rows.map((i) => [
      i.entityName,
      i.typeLabel,
      i.category,
      i.status,
      i.effectiveDate ? formatDate(i.effectiveDate) : '',
      i.referenceNumber ?? '',
    ]);
    const csv = [header, ...body]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-${tab.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Compliance"
        description="DOT/FMCSA compliance for drivers, vehicles, permits and company authority"
        actions={
          <div className="flex items-center gap-2">
            {view === 'requirements' && (
              <>
                <button onClick={exportCsv} className="btn-secondary text-sm">
                  Export CSV
                </button>
                <button onClick={() => window.print()} className="btn-secondary text-sm">
                  Print
                </button>
              </>
            )}
            <button onClick={() => setShowSettings(true)} className="btn-secondary text-sm">
              Settings
            </button>
          </div>
        }
      />

      {/* View switcher */}
      <div className="mb-5 inline-flex rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-0.5">
        {(['overview', 'requirements', 'calendar'] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium capitalize transition ${
              view === v
                ? 'bg-[var(--brand-amber)] text-[#1a1206]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {error && !loading ? (
        <ErrorState message={error} onRetry={() => void refresh()} className="mb-6" />
      ) : null}

      {loading ? (
        <div className="card">
          <LoadingBlock rows={8} />
        </div>
      ) : view === 'overview' && overview ? (
        <OverviewView data={overview} onJump={jumpToRequirements} />
      ) : view === 'calendar' ? (
        <CalendarView items={items} />
      ) : (
        <>
          {/* Entity tabs */}
          <div className="mb-4 flex flex-wrap gap-1 border-b border-[var(--border-color)]">
            {ENTITY_TABS.map((t) => {
              const ent = overview?.entities[t.key];
              return (
                <button
                  key={t.key}
                  onClick={() => {
                    setTab(t.key);
                    setPage(1);
                  }}
                  className={`relative px-3.5 py-2 text-sm font-medium transition ${
                    tab === t.key
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {t.label}
                  {ent && ent.issues > 0 && (
                    <span className="ml-1.5 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-500">
                      {ent.issues}
                    </span>
                  )}
                  {tab === t.key && (
                    <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[var(--brand-amber)]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search entity, requirement, reference…"
              className="input max-w-xs flex-1"
            />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as ComplianceStatus | '');
                setPage(1);
              }}
              className="input w-auto"
            >
              <option value="">All statuses</option>
              <option value="EXPIRED">Expired</option>
              <option value="DUE_SOON">Due soon</option>
              <option value="MISSING">Missing</option>
              <option value="VALID">Valid</option>
              <option value="NA">N/A</option>
            </select>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="input w-auto"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {selected.size > 0 && (
            <div className="mb-3 flex items-center gap-3 rounded-lg border border-[var(--brand-amber)]/40 bg-[var(--brand-amber)]/10 px-3 py-2 text-sm">
              <span className="text-[var(--text-primary)]">{selected.size} selected</span>
              <button onClick={exportCsv} className="font-medium text-[var(--brand-amber)]">
                Export selected
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="ml-auto text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                Clear
              </button>
            </div>
          )}

          {/* Table */}
          <div className="card p-0 overflow-hidden">
            {items.length === 0 ? (
              <EmptyState
                title="No compliance items"
                description="Adjust filters, or enable more requirement types in Settings."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="w-8">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[var(--brand-amber)]"
                          checked={selected.size === items.length && items.length > 0}
                          onChange={(e) =>
                            setSelected(e.target.checked ? new Set(items.map((i) => i.id)) : new Set())
                          }
                        />
                      </th>
                      <th>Entity</th>
                      <th>Requirement</th>
                      <th>Category</th>
                      <th>Due date</th>
                      <th>Status</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className={item.status === 'EXPIRED' ? 'bg-red-500/[0.03]' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[var(--brand-amber)]"
                            checked={selected.has(item.id)}
                            onChange={() => toggleSelect(item.id)}
                          />
                        </td>
                        <td className="font-medium">
                          <button
                            onClick={() => setProfile(item)}
                            className="text-left text-[var(--brand-teal)] hover:underline"
                          >
                            {item.entityName}
                          </button>
                          {item.entitySubtitle && (
                            <div className="text-xs text-[var(--text-muted)]">{item.entitySubtitle}</div>
                          )}
                        </td>
                        <td className="text-[var(--text-secondary)]">{item.typeLabel}</td>
                        <td className="text-[var(--text-muted)]">{item.category}</td>
                        <td className="text-[var(--text-secondary)]">
                          {item.effectiveDate ? formatDate(item.effectiveDate) : '—'}
                        </td>
                        <td>
                          <StatusChip status={item.status} days={item.daysRemaining} />
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => setRenewing(item)}
                            className="rounded-md border border-[var(--border-color)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--brand-amber)] hover:text-[var(--text-primary)]"
                          >
                            {item.persisted ? 'Renew' : 'Record'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-[var(--text-muted)]">
              <span>
                {total} item{total === 1 ? '' : 's'} · page {page} of {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="btn-secondary px-3 py-1 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="btn-secondary px-3 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {renewing && (
        <RenewModal
          item={renewing}
          onClose={() => setRenewing(null)}
          onSaved={() => {
            setRenewing(null);
            void refresh();
          }}
        />
      )}

      {profile && profile.entityId && (
        <EntityProfileModal
          entityType={profile.entityType}
          entityId={profile.entityId}
          entityName={profile.entityName}
          onClose={() => setProfile(null)}
          onChanged={() => void refresh()}
        />
      )}

      {showSettings && (
        <ComplianceSettingsModal
          onClose={() => setShowSettings(false)}
          onChanged={() => void refresh()}
        />
      )}
    </div>
  );
}
