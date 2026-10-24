'use client';

import { useCallback, useEffect, useState } from 'react';
import { accountingCategories, accountingCategoryLabel, paymentMethodLabel } from '@haulyard/shared-types';
import { AccountingEntryModal } from '@/components/accounting/AccountingEntryModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Pagination, type PageMeta } from '@/components/ui/Pagination';
import { SearchInput } from '@/components/ui/SearchInput';
import { getApiErrorMessage } from '@/lib/api-errors';
import { formatEntryDay, type AccountingEntry, type AccountingEntryKind } from '@/lib/accounting';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';

interface Props {
  kind: AccountingEntryKind;
  canWrite: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
}

export function AccountingEntriesTab({ kind, canWrite, onChanged, onError }: Props) {
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [totalAmountCents, setTotalAmountCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AccountingEntry | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toDelete, setToDelete] = useState<AccountingEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounting/entries', {
        params: {
          kind,
          page,
          limit: 20,
          ...(category && { category }),
          ...(from && { from }),
          ...(to && { to }),
          ...(search.trim() && { search: search.trim() }),
        },
      });
      setEntries(res.data.data ?? []);
      setMeta(res.data.meta ?? null);
      setTotalAmountCents(res.data.totalAmountCents ?? 0);
    } catch (err) {
      onError(getApiErrorMessage(err, 'Could not load entries'));
    } finally {
      setLoading(false);
    }
  }, [kind, page, category, from, to, search, onError]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const refresh = () => {
    void fetchEntries();
    onChanged();
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/accounting/entries/${toDelete.id}`);
      setToDelete(null);
      refresh();
    } catch (err) {
      onError(getApiErrorMessage(err, 'Could not delete the entry'));
    } finally {
      setDeleting(false);
    }
  };

  const noun = kind === 'INCOME' ? 'income' : 'expense';
  const filtered = Boolean(category || from || to || search.trim());

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-2">
          <select
            className="input w-auto py-1.5 text-sm"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {accountingCategories(kind).map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <label className="text-xs text-[var(--text-muted)]">
            From
            <input
              type="date"
              className="input mt-0.5 py-1.5 text-sm"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="text-xs text-[var(--text-muted)]">
            To
            <input
              type="date"
              className="input mt-0.5 py-1.5 text-sm"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <SearchInput
            wrapperClassName="min-w-[200px]"
            placeholder="Search vendor, notes, invoice #…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {canWrite ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            + Add {noun}
          </button>
        ) : null}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-3 text-sm">
          <span className="text-[var(--text-muted)]">
            {meta?.total ?? 0} {noun}
            {meta?.total === 1 ? '' : 's'}
            {filtered ? ' matching the filters' : ''}
          </span>
          <span className={`font-semibold tabular-nums ${kind === 'INCOME' ? 'text-emerald-500' : 'text-red-400'}`}>
            {formatCurrency(totalAmountCents)}
          </span>
        </div>
        {loading ? (
          <div className="p-4 text-sm text-[var(--text-muted)]">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            {filtered ? 'Nothing matches these filters.' : `No ${noun} entries yet.`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 font-medium">{kind === 'INCOME' ? 'From' : 'Vendor'}</th>
                  {kind === 'EXPENSE' ? <th className="px-4 py-2 font-medium">Truck</th> : null}
                  <th className="px-4 py-2 font-medium">Paid by</th>
                  <th className="px-4 py-2 font-medium">Invoice #</th>
                  <th className="px-4 py-2 font-medium">Notes</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  {canWrite ? <th className="px-4 py-2" /> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[var(--surface-hover)]">
                    <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-secondary)]">{formatEntryDay(entry.date)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-primary)]">{accountingCategoryLabel(entry.category)}</td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)]">{entry.vendor || '—'}</td>
                    {kind === 'EXPENSE' ? (
                      <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-secondary)]">
                        {entry.truck ? `Unit ${entry.truck.unitNumber}` : '—'}
                      </td>
                    ) : null}
                    <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-secondary)]">{paymentMethodLabel(entry.paymentMethod)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-secondary)]">{entry.reference || '—'}</td>
                    <td className="max-w-[16rem] truncate px-4 py-2.5 text-[var(--text-muted)]" title={entry.description ?? undefined}>
                      {entry.description || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums text-[var(--text-primary)]">
                      {formatCurrency(entry.amount)}
                    </td>
                    {canWrite ? (
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <button
                          type="button"
                          className="mr-3 text-xs text-[var(--text-muted)] transition hover:text-[var(--brand-amber)]"
                          onClick={() => {
                            setEditing(entry);
                            setModalOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-xs text-[var(--text-muted)] transition hover:text-red-400"
                          onClick={() => setToDelete(entry)}
                        >
                          Delete
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination meta={meta} noun={noun} onPageChange={setPage} />

      <AccountingEntryModal
        isOpen={modalOpen}
        kind={kind}
        entry={editing}
        onClose={() => setModalOpen(false)}
        onSaved={refresh}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={`Delete this ${noun}?`}
        message={
          toDelete
            ? `${accountingCategoryLabel(toDelete.category)} · ${formatCurrency(toDelete.amount)} on ${formatEntryDay(toDelete.date)}. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onCancel={() => !deleting && setToDelete(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
