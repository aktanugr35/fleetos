'use client';

import { useEffect, useState } from 'react';
import { accountingCategories, PAYMENT_METHODS } from '@haulyard/shared-types';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { FormField, FormInput, FormSelect, FormTextarea } from '@/components/ui/FormElements';
import { getApiErrorMessage } from '@/lib/api-errors';
import { parseMoneyInput, todayInputValue, type AccountingEntry, type AccountingEntryKind } from '@/lib/accounting';
import api from '@/lib/api';

interface Props {
  isOpen: boolean;
  kind: AccountingEntryKind;
  entry: AccountingEntry | null;
  onClose: () => void;
  onSaved: () => void;
}

interface TruckOption {
  id: string;
  unitNumber: string;
}

const emptyForm = (kind: AccountingEntryKind) => ({
  category: accountingCategories(kind)[0].key,
  date: todayInputValue(),
  amount: '',
  vendor: '',
  paymentMethod: '',
  reference: '',
  truckId: '',
  description: '',
});

export function AccountingEntryModal({ isOpen, kind, entry, onClose, onSaved }: Props) {
  const isEdit = Boolean(entry);
  const [form, setForm] = useState(() => emptyForm(kind));
  const [trucks, setTrucks] = useState<TruckOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setForm(
      entry
        ? {
            category: entry.category,
            date: entry.date.slice(0, 10),
            amount: (entry.amount / 100).toFixed(2),
            vendor: entry.vendor ?? '',
            paymentMethod: entry.paymentMethod ?? '',
            reference: entry.reference ?? '',
            truckId: entry.truckId ?? '',
            description: entry.description ?? '',
          }
        : emptyForm(kind),
    );
    if (kind === 'EXPENSE') {
      api
        .get('/trucks?limit=500')
        .then((res) => setTrucks(res.data.data ?? []))
        .catch(() => setTrucks([]));
    }
  }, [isOpen, entry, kind]);

  const set = (field: keyof ReturnType<typeof emptyForm>, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async () => {
    const amount = parseMoneyInput(form.amount);
    if (amount === null) {
      setError('Enter an amount greater than 0');
      return;
    }
    if (!form.date) {
      setError('Pick a date');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        kind,
        category: form.category,
        date: form.date,
        amount,
        vendor: form.vendor,
        paymentMethod: form.paymentMethod || null,
        reference: form.reference,
        truckId: kind === 'EXPENSE' ? form.truckId || null : null,
        description: form.description,
      };
      if (entry) await api.put(`/accounting/entries/${entry.id}`, payload);
      else await api.post('/accounting/entries', payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save the entry'));
    } finally {
      setSaving(false);
    }
  };

  const noun = kind === 'INCOME' ? 'Income' : 'Expense';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? `Edit ${noun}` : `Add ${noun}`} size="md">
      {error ? (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</div>
      ) : null}

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Category" required>
            <FormSelect
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              options={accountingCategories(kind).map((c) => ({ value: c.key, label: c.label }))}
            />
          </FormField>
          <FormField label="Amount ($)" required>
            <FormInput inputMode="decimal" placeholder="0.00" value={form.amount} onChange={(e) => set('amount', e.target.value)} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Date" required>
            <FormInput type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </FormField>
          <FormField label={kind === 'INCOME' ? 'Received from' : 'Paid to (vendor)'}>
            <FormInput value={form.vendor} maxLength={120} onChange={(e) => set('vendor', e.target.value)} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Payment method">
            <FormSelect
              value={form.paymentMethod}
              onChange={(e) => set('paymentMethod', e.target.value)}
              placeholder="—"
              options={PAYMENT_METHODS.map((m) => ({ value: m.key, label: m.label }))}
            />
          </FormField>
          <FormField label="Invoice / check #">
            <FormInput value={form.reference} maxLength={100} onChange={(e) => set('reference', e.target.value)} />
          </FormField>
        </div>

        {kind === 'EXPENSE' ? (
          <FormField label="Truck">
            <FormSelect
              value={form.truckId}
              onChange={(e) => set('truckId', e.target.value)}
              placeholder="Company-wide (no truck)"
              options={trucks.map((t) => ({ value: t.id, label: `Unit ${t.unitNumber}` }))}
            />
          </FormField>
        ) : null}

        <FormField label="Notes">
          <FormTextarea rows={2} maxLength={500} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </FormField>
      </div>

      <ModalFooter>
        <button type="button" onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        <button type="button" onClick={() => void handleSubmit()} disabled={saving} className="btn btn-primary">
          {saving ? 'Saving...' : isEdit ? 'Save changes' : `Add ${noun.toLowerCase()}`}
        </button>
      </ModalFooter>
    </Modal>
  );
}
