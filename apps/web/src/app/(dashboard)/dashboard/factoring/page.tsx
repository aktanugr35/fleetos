'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SearchInput } from '@/components/ui/SearchInput';
import { Toast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api-errors';
import { formatCurrency, formatDate } from '@/lib/utils';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/api';

type BillingMethod = 'FACTORING' | 'IN_HOUSE';
type View = 'open' | 'submitted' | 'all';

interface FactoringLoad {
  id: string;
  loadNumber: string;
  puNumber: string | null;
  brokerName: string;
  pickupLocation: string;
  deliveryLocation: string;
  pickupDate: string;
  deliveryDate: string | null;
  driverName: string;
  amountCents: number;
  billingMethod: BillingMethod | null;
  billingSubmittedAt: string | null;
  billingSubmittedTo: string | null;
}

interface Summary {
  openCount: number;
  openAmountCents: number;
  emailConfigured: boolean;
  factoringEmail: string | null;
  inHouseFinanceEmail: string | null;
}

interface Meta {
  page: number;
  totalPages: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const METHOD_LABEL: Record<BillingMethod, string> = {
  FACTORING: 'Factoring',
  IN_HOUSE: 'In-house finance',
};

const VIEWS: { id: View; label: string }[] = [
  { id: 'open', label: 'To submit' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'all', label: 'All' },
];

export default function FactoringPage() {
  const { can } = usePermission();
  const canEditSettings = can('company:write');
  const [view, setView] = useState<View>('open');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loads, setLoads] = useState<FactoringLoad[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [methods, setMethods] = useState<Record<string, BillingMethod>>({});
  const [toConfirm, setToConfirm] = useState<{ load: FactoringLoad; method: BillingMethod } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchLoads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/factoring/loads', {
        params: { view, page, limit: 25, ...(search.trim() ? { search: search.trim() } : {}) },
      });
      setLoads(res.data.data ?? []);
      setMeta(res.data.meta ?? null);
      setSummary(res.data.summary ?? null);
    } catch (err) {
      setToast({ type: 'error', message: getApiErrorMessage(err, 'Failed to load factoring list') });
    } finally {
      setLoading(false);
    }
  }, [view, page, search]);

  useEffect(() => {
    void fetchLoads();
  }, [fetchLoads]);

  const recipientFor = (method: BillingMethod) =>
    method === 'FACTORING' ? summary?.factoringEmail : summary?.inHouseFinanceEmail;

  const handleSubmit = async () => {
    if (!toConfirm) return;
    const { load, method } = toConfirm;
    setBusyId(load.id);
    try {
      await api.post(`/factoring/loads/${load.id}/submit`, { method });
      setToast({ type: 'success', message: `${load.puNumber ? `PU# ${load.puNumber}` : load.loadNumber} sent to ${METHOD_LABEL[method]}` });
      setToConfirm(null);
      setMethods((prev) => {
        const next = { ...prev };
        delete next[load.id];
        return next;
      });
      await fetchLoads();
    } catch (err) {
      setToast({ type: 'error', message: getApiErrorMessage(err, 'Could not submit this load') });
      setToConfirm(null);
    } finally {
      setBusyId(null);
    }
  };

  const handleUndo = async (load: FactoringLoad) => {
    setBusyId(load.id);
    try {
      await api.post(`/factoring/loads/${load.id}/undo`);
      setToast({ type: 'success', message: `${load.loadNumber} moved back to "To submit"` });
      await fetchLoads();
    } catch (err) {
      setToast({ type: 'error', message: getApiErrorMessage(err, 'Could not undo') });
    } finally {
      setBusyId(null);
    }
  };

  const missingRecipients = summary && (!summary.emailConfigured || (!summary.factoringEmail && !summary.inHouseFinanceEmail));

  return (
    <div>
      <PageHeader
        title="Factoring"
        description="Delivered and TONU loads appear here to submit to factoring or in-house finance. Amazon loads are not listed."
      />

      {missingRecipients ? (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Invoice emails are not set up yet. Add the email server and the factoring / in-house finance addresses in{' '}
          {canEditSettings ? (
            <Link href="/dashboard/settings" className="underline">Settings → Email</Link>
          ) : (
            'Settings → Email (ask an admin)'
          )}
          .
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card">
          <div className={`text-2xl font-bold ${summary?.openCount ? 'text-red-500' : 'text-emerald-500'}`}>{summary?.openCount ?? 0}</div>
          <div className="mt-0.5 text-xs text-[var(--text-muted)]">Loads not submitted</div>
          <div className="mt-1 text-[10px] text-[var(--text-muted)]">{formatCurrency(summary?.openAmountCents ?? 0)} waiting to be invoiced</div>
        </div>
        <div className="card sm:col-span-2 text-xs text-[var(--text-muted)] space-y-1">
          <div>
            <span className="text-[var(--text-secondary)]">Factoring email:</span>{' '}
            {summary?.factoringEmail || <span className="text-amber-400">not set</span>}
          </div>
          <div>
            <span className="text-[var(--text-secondary)]">In-house finance email:</span>{' '}
            {summary?.inHouseFinanceEmail || <span className="text-amber-400">not set</span>}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setView(v.id);
                setPage(1);
              }}
              className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                view === v.id ? 'bg-[var(--brand-amber)] text-[#1a1206]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <SearchInput
          wrapperClassName="min-w-[200px] sm:max-w-xs flex-1"
          placeholder="Search load #, PU #, broker…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 text-sm text-[var(--text-muted)]">Loading...</div>
        ) : loads.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            {view === 'open' ? 'Every load has been submitted.' : 'No loads found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-muted)] border-b border-[var(--border-color)]">
                  <th className="px-4 py-2 font-medium">Load #</th>
                  <th className="px-4 py-2 font-medium">Broker</th>
                  <th className="px-4 py-2 font-medium">PU #</th>
                  <th className="px-4 py-2 font-medium">PU date</th>
                  <th className="px-4 py-2 font-medium">DO date</th>
                  <th className="px-4 py-2 font-medium">Pickup</th>
                  <th className="px-4 py-2 font-medium">Drop off</th>
                  <th className="px-4 py-2 font-medium">Driver</th>
                  <th className="px-4 py-2 font-medium text-right">Amount</th>
                  <th className="px-4 py-2 font-medium">Billing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {loads.map((load) => {
                  const selected = methods[load.id];
                  const busy = busyId === load.id;
                  return (
                    <tr key={load.id} className="hover:bg-[var(--surface-hover)]">
                      <td className="px-4 py-2.5 whitespace-nowrap font-medium text-[var(--brand-teal)]">{load.loadNumber}</td>
                      <td className="px-4 py-2.5 min-w-[9rem] text-[var(--text-primary)]">{load.brokerName}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[var(--text-secondary)]">{load.puNumber || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[var(--text-secondary)]">{formatDate(load.pickupDate)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[var(--text-secondary)]">{load.deliveryDate ? formatDate(load.deliveryDate) : '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[var(--text-secondary)]">{load.pickupLocation}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[var(--text-secondary)]">{load.deliveryLocation}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[var(--text-secondary)]">{load.driverName}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right font-semibold text-[var(--text-primary)]">{formatCurrency(load.amountCents)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {load.billingSubmittedAt ? (
                          <div className="flex items-center gap-3">
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/12 px-2 py-0.5 text-xs font-medium text-emerald-500"
                              title={load.billingSubmittedTo ? `Emailed to ${load.billingSubmittedTo}` : 'Invoiced before the Factoring page existed'}
                            >
                              ✓ {load.billingMethod ? METHOD_LABEL[load.billingMethod] : 'Submitted'} · {formatDate(load.billingSubmittedAt)}
                            </span>
                            <button
                              type="button"
                              disabled={busy}
                              className="text-xs text-[var(--text-muted)] hover:text-red-400 transition"
                              onClick={() => void handleUndo(load)}
                            >
                              Undo
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <select
                              className="input py-1 text-xs w-auto"
                              value={selected ?? ''}
                              onChange={(e) =>
                                setMethods((prev) => ({ ...prev, [load.id]: e.target.value as BillingMethod }))
                              }
                            >
                              <option value="" disabled>Choose…</option>
                              <option value="FACTORING">Factoring</option>
                              <option value="IN_HOUSE">In-house finance</option>
                            </select>
                            <button
                              type="button"
                              className="btn btn-primary px-3 py-1 text-xs"
                              disabled={!selected || busy}
                              onClick={() => selected && setToConfirm({ load, method: selected })}
                            >
                              {busy ? 'Sending…' : 'Submit'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {meta && meta.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-[var(--text-muted)]">
          <span>
            {meta.total} load{meta.total === 1 ? '' : 's'} · page {meta.page} of {meta.totalPages}
          </span>
          <div className="flex gap-1">
            <button type="button" disabled={!meta.hasPrev} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn-secondary px-3 py-1 disabled:opacity-40">
              Prev
            </button>
            <button type="button" disabled={!meta.hasNext} onClick={() => setPage((p) => p + 1)} className="btn-secondary px-3 py-1 disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(toConfirm)}
        title={toConfirm ? `Submit to ${METHOD_LABEL[toConfirm.method]}?` : ''}
        message={
          toConfirm
            ? `An invoice email for ${toConfirm.load.puNumber ? `PU# ${toConfirm.load.puNumber}` : toConfirm.load.loadNumber} (${formatCurrency(toConfirm.load.amountCents)}) will be sent to ${recipientFor(toConfirm.method) || 'the address in Settings'}.`
            : ''
        }
        confirmLabel="Submit & send email"
        loading={Boolean(busyId)}
        onCancel={() => !busyId && setToConfirm(null)}
        onConfirm={() => void handleSubmit()}
      />

      {toast ? <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
