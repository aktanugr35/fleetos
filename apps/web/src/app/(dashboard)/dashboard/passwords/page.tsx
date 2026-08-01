'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { Toast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PasswordCard } from '@/components/passwords/PasswordCard';
import { PasswordDetailModal, PasswordFormModal } from '@/components/passwords/PasswordModals';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/api';
import type { CompanyPassword, PasswordCategory, PasswordFormValues } from '@/lib/passwords';
import { PASSWORD_CATEGORIES, PASSWORD_CATEGORY_LABELS } from '@/lib/passwords';

export default function PasswordsPage() {
  const { can } = usePermission();
  const canManage = can('passwords:manage');

  const [entries, setEntries] = useState<CompanyPassword[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<PasswordCategory | 'ALL'>('ALL');
  const [selected, setSelected] = useState<CompanyPassword | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyPassword | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyPassword | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'ALL') params.set('category', category);
      if (search.trim()) params.set('search', search.trim());
      const query = params.toString();
      const response = await api.get(`/passwords${query ? `?${query}` : ''}`);
      setEntries(response.data.data);
    } catch {
      setEntries([]);
      setToast({ type: 'error', message: 'Could not load password entries' });
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(PASSWORD_CATEGORIES.map((key) => [key, 0])) as Record<
      PasswordCategory,
      number
    >;
    for (const entry of entries) {
      counts[entry.category] += 1;
    }
    return counts;
  }, [entries]);

  const filtered = useMemo(() => {
    if (category === 'ALL') return entries;
    return entries.filter((entry) => entry.category === category);
  }, [entries, category]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
  };

  const handleCreate = async (values: PasswordFormValues) => {
    setSaving(true);
    try {
      await api.post('/passwords', {
        title: values.title,
        category: values.category,
        url: values.url || null,
        username: values.username || null,
        password: values.password,
        notes: values.notes || null,
      });
      setFormOpen(false);
      showToast('Password entry added');
      await loadEntries();
    } catch {
      showToast('Could not add password entry', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (values: PasswordFormValues) => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.patch(`/passwords/${editing.id}`, {
        title: values.title,
        category: values.category,
        url: values.url || null,
        username: values.username || null,
        ...(values.password ? { password: values.password } : {}),
        notes: values.notes || null,
      });
      setEditing(null);
      setFormOpen(false);
      setSelected(null);
      showToast('Password entry updated');
      await loadEntries();
    } catch {
      showToast('Could not update password entry', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api.delete(`/passwords/${deleteTarget.id}`);
      setDeleteTarget(null);
      setSelected(null);
      showToast('Password entry deleted');
      await loadEntries();
    } catch {
      showToast('Could not delete password entry', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Passwords"
        description="Company portal logins — copy credentials without opening the spreadsheet"
        actions={
          canManage ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add entry
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Saved entries</p>
          <p className="text-2xl font-bold text-gray-100 mt-1">{entries.length}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Permits & tax</p>
          <p className="text-2xl font-bold text-gray-100 mt-1">{categoryCounts.PERMITS_TAX}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Load boards</p>
          <p className="text-2xl font-bold text-gray-100 mt-1">{categoryCounts.LOAD_BOARDS}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search system, email, notes…"
          className="w-full lg:max-w-md"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
              category === 'ALL'
                ? 'border-[var(--brand-teal)] bg-[color-mix(in_srgb,var(--brand-teal)_12%,transparent)] text-[var(--brand-teal)]'
                : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            onClick={() => setCategory('ALL')}
          >
            All
          </button>
          {PASSWORD_CATEGORIES.map((key) => (
            <button
              key={key}
              type="button"
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                category === key
                  ? 'border-[var(--brand-teal)] bg-[color-mix(in_srgb,var(--brand-teal)_12%,transparent)] text-[var(--brand-teal)]'
                  : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              onClick={() => setCategory(key)}
            >
              {PASSWORD_CATEGORY_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingBlock rows={6} />
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-[var(--text-secondary)]">No password entries found.</p>
          {canManage && (
            <button
              type="button"
              className="btn btn--primary mt-4"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add first entry
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((entry) => (
            <PasswordCard key={entry.id} entry={entry} onOpen={setSelected} />
          ))}
        </div>
      )}

      <PasswordDetailModal
        entry={selected}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        canManage={canManage}
        onEdit={(entry) => {
          setEditing(entry);
          setFormOpen(true);
        }}
        onDelete={setDeleteTarget}
        toast={showToast}
      />

      <PasswordFormModal
        key={editing?.id ?? 'new'}
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        initial={editing}
        saving={saving}
        onSubmit={editing ? handleUpdate : handleCreate}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete password entry?"
        message={`Remove "${deleteTarget?.title}" from the vault. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={saving}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
