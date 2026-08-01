'use client';

import { useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { FormField, FormInput, FormSelect, FormTextarea } from '@/components/ui/FormElements';
import type { CompanyPassword, PasswordCategory, PasswordFormValues } from '@/lib/passwords';
import { PASSWORD_CATEGORIES, PASSWORD_CATEGORY_LABELS, copyText } from '@/lib/passwords';

interface PasswordDetailModalProps {
  entry: CompanyPassword | null;
  isOpen: boolean;
  onClose: () => void;
  canManage: boolean;
  onEdit: (entry: CompanyPassword) => void;
  onDelete: (entry: CompanyPassword) => void;
  toast: (message: string, type?: 'success' | 'error') => void;
}

export function PasswordDetailModal({
  entry,
  isOpen,
  onClose,
  canManage,
  onEdit,
  onDelete,
  toast,
}: PasswordDetailModalProps) {
  const [showPassword, setShowPassword] = useState(false);

  if (!entry) return null;

  const handleCopy = async (value: string | null | undefined, label: string) => {
    if (!value) return;
    try {
      const message = await copyText(value, label);
      toast(message, 'success');
    } catch {
      toast(`Could not copy ${label.toLowerCase()}`, 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={entry.title}
      description={PASSWORD_CATEGORY_LABELS[entry.category]}
      size="md"
    >
      <div className="space-y-4">
        {entry.url && (
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-1">Portal link</p>
            <div className="flex items-center gap-2">
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--accent)] hover:underline break-all"
              >
                {entry.url}
              </a>
              <button
                type="button"
                className="btn btn-primary text-xs px-2 py-1"
                onClick={() => void handleCopy(entry.url, 'Link')}
              >
                Copy
              </button>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-1">Username / email</p>
          <div className="flex items-center gap-2">
            <p className="text-sm text-[var(--text-primary)] break-all flex-1">
              {entry.username || '—'}
            </p>
            {entry.username && (
              <button
                type="button"
                className="btn btn-primary text-xs px-2 py-1"
                onClick={() => void handleCopy(entry.username, 'Username')}
              >
                Copy
              </button>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-1">Password / PIN</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-mono text-[var(--text-primary)] break-all flex-1">
              {showPassword ? entry.password : '••••••••••••'}
            </p>
            <button
              type="button"
              className="btn btn-primary text-xs px-2 py-1"
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
            <button
              type="button"
              className="btn btn-primary text-xs px-2 py-1"
              onClick={() => void handleCopy(entry.password, 'Password')}
            >
              Copy
            </button>
          </div>
        </div>

        {entry.notes && (
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-1">Notes</p>
            <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{entry.notes}</p>
          </div>
        )}
      </div>

      {canManage && (
        <ModalFooter>
          <button type="button" className="btn btn-danger" onClick={() => onDelete(entry)}>
            Delete
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => onEdit(entry)}>
            Edit
          </button>
        </ModalFooter>
      )}
    </Modal>
  );
}

interface PasswordFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initial?: CompanyPassword | null;
  saving: boolean;
  onSubmit: (values: PasswordFormValues) => Promise<void>;
}

export function PasswordFormModal({
  isOpen,
  onClose,
  initial,
  saving,
  onSubmit,
}: PasswordFormModalProps) {
  const [form, setForm] = useState<PasswordFormValues>(() =>
    initial
      ? {
          title: initial.title,
          category: initial.category,
          url: initial.url ?? '',
          username: initial.username ?? '',
          password: initial.password,
          notes: initial.notes ?? '',
        }
      : {
          title: '',
          category: 'OTHER',
          url: '',
          username: '',
          password: '',
          notes: '',
        },
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(form);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initial ? 'Edit password entry' : 'Add password entry'}
      size="md"
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <FormField label="System / platform">
          <FormInput
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />
        </FormField>

        <FormField label="Category">
          <FormSelect
            value={form.category}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, category: event.target.value as PasswordCategory }))
            }
            options={PASSWORD_CATEGORIES.map((category) => ({
              value: category,
              label: PASSWORD_CATEGORY_LABELS[category],
            }))}
          />
        </FormField>

        <FormField label="Portal link">
          <FormInput
            value={form.url}
            onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
            placeholder="https://..."
          />
        </FormField>

        <FormField label="Username / email">
          <FormInput
            value={form.username}
            onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
          />
        </FormField>

        <FormField label={initial ? 'Password / PIN (leave blank to keep current)' : 'Password / PIN'}>
          <FormInput
            type="password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            required={!initial}
          />
        </FormField>

        <FormField label="Notes">
          <FormTextarea
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            rows={3}
          />
        </FormField>

        <ModalFooter>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Add entry'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
