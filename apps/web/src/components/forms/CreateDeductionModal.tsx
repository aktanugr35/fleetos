'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { FormField, FormInput, FormSelect, FormTextarea } from '@/components/ui/FormElements';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { DeductionRecord, toDateInputValue } from '@/lib/deductions';

interface CreateDeductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  driverId?: string;
  driverName?: string;
  deduction?: DeductionRecord | null;
}

const DEDUCTION_TYPES = [
  { value: 'CASH_ADVANCE', label: 'Cash Advance' },
  { value: 'INSURANCE_ESCROW', label: 'Insurance / Escrow' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'LUMPER', label: 'Lumper' },
  { value: 'VIOLATION_FINE', label: 'Violation Fine' },
  { value: 'OTHER', label: 'Other' },
];

export function CreateDeductionModal({
  isOpen,
  onClose,
  onSuccess,
  driverId: fixedDriverId,
  driverName,
  deduction,
}: CreateDeductionModalProps) {
  const isEdit = Boolean(deduction?.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [drivers, setDrivers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);

  const [form, setForm] = useState({
    driverId: fixedDriverId || '',
    type: 'CASH_ADVANCE',
    amount: '',
    grossAmount: '',
    discount: '',
    gallons: '',
    merchant: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    isRecurring: false,
  });

  const isFuel = form.type === 'FUEL';

  const fuelNetCents = useMemo(() => {
    const gross = Math.round((parseFloat(form.grossAmount) || 0) * 100);
    const discount = Math.round((parseFloat(form.discount) || 0) * 100);
    return Math.max(0, gross - discount);
  }, [form.grossAmount, form.discount]);

  useEffect(() => {
    if (!isOpen) return;

    setError('');

    if (deduction) {
      const meta = deduction.metadata;
      const grossCents = meta?.grossAmount ?? deduction.amount + (meta?.discount ?? 0);
      setForm({
        driverId: deduction.driverId,
        type: deduction.type,
        amount: deduction.type === 'FUEL' ? '' : (deduction.amount / 100).toFixed(2),
        grossAmount: deduction.type === 'FUEL' ? (grossCents / 100).toFixed(2) : '',
        discount: meta?.discount ? (meta.discount / 100).toFixed(2) : '',
        gallons: meta?.gallons != null ? String(meta.gallons) : '',
        merchant: meta?.merchant || '',
        date: toDateInputValue(deduction.date),
        description: deduction.description,
        isRecurring: deduction.isRecurring,
      });
    } else {
      setForm({
        driverId: fixedDriverId || '',
        type: 'CASH_ADVANCE',
        amount: '',
        grossAmount: '',
        discount: '',
        gallons: '',
        merchant: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        isRecurring: false,
      });
    }

    if (!fixedDriverId && !deduction) {
      api.get('/drivers').then((res) => setDrivers(res.data.data)).catch(() => {});
    }
  }, [isOpen, fixedDriverId, deduction]);

  const set = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async () => {
    if (!form.driverId) {
      setError('Please select a driver');
      return;
    }
    if (!form.description.trim()) {
      setError('Description is required');
      return;
    }

    let amountCents: number;
    let metadata: Record<string, unknown> | undefined;

    if (isFuel) {
      const grossCents = Math.round((parseFloat(form.grossAmount) || 0) * 100);
      const discountCents = Math.round((parseFloat(form.discount) || 0) * 100);
      amountCents = grossCents - discountCents;
      if (grossCents < 1) {
        setError('Enter the fuel purchase amount');
        return;
      }
      if (amountCents < 1) {
        setError('Discount cannot equal or exceed fuel amount');
        return;
      }
      metadata = {
        grossAmountCents: grossCents,
        discountCents,
        merchant: form.merchant.trim() || undefined,
        gallons: form.gallons ? parseFloat(form.gallons) : undefined,
      };
    } else {
      if (!form.amount || parseFloat(form.amount) <= 0) {
        setError('Please enter a valid amount');
        return;
      }
      amountCents = Math.round(parseFloat(form.amount) * 100);
    }

    setLoading(true);
    try {
      const payload = {
        driverId: form.driverId,
        type: form.type,
        amount: amountCents,
        date: form.date,
        description: form.description.trim(),
        isRecurring: form.isRecurring,
        metadata,
      };
      if (isEdit && deduction) {
        await api.patch(`/deductions/${deduction.id}`, payload);
      } else {
        await api.post('/deductions', payload);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || (isEdit ? 'Failed to update deduction' : 'Failed to create deduction');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const title = isEdit
    ? 'Edit Deduction'
    : fixedDriverId && driverName
      ? `Add Deduction — ${driverName}`
      : 'Add Deduction';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={fixedDriverId ? 'This deduction will be assigned to the selected driver.' : undefined}
      size="md"
    >
      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {!fixedDriverId ? (
          <FormField label="Driver" required>
            <FormSelect
              value={form.driverId}
              onChange={(e) => set('driverId', e.target.value)}
              placeholder="Select driver"
              options={drivers.map((d) => ({
                value: d.id,
                label: `${d.firstName} ${d.lastName}`,
              }))}
            />
          </FormField>
        ) : (
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Driver</p>
            <p className="text-sm font-medium text-gray-100 mt-1">{driverName}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Type" required>
            <FormSelect
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
              options={DEDUCTION_TYPES}
            />
          </FormField>
          {!isFuel && (
            <FormField label="Amount ($)" required>
              <FormInput
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
              />
            </FormField>
          )}
        </div>

        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-gray-400">
          Fuel and toll charges are managed from the Fuel/Toll screen so they can be tied to trucks and applied to settlements automatically.
        </div>

        {isFuel && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-4">
            <p className="text-xs font-medium text-amber-400 uppercase tracking-wide">Fuel purchase</p>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Gross amount ($)" required>
                <FormInput
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="700.00"
                  value={form.grossAmount}
                  onChange={(e) => set('grossAmount', e.target.value)}
                />
              </FormField>
              <FormField label="Discount ($)">
                <FormInput
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="100.00"
                  value={form.discount}
                  onChange={(e) => set('discount', e.target.value)}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Gallons (optional)">
                <FormInput
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="150"
                  value={form.gallons}
                  onChange={(e) => set('gallons', e.target.value)}
                />
              </FormField>
              <FormField label="Merchant / location (optional)">
                <FormInput
                  value={form.merchant}
                  onChange={(e) => set('merchant', e.target.value)}
                  placeholder="Pilot #1234"
                />
              </FormField>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-amber-500/20 text-sm">
              <span className="text-gray-400">Driver pays (deducted)</span>
              <span className="font-bold text-red-400">-{formatCurrency(fuelNetCents)}</span>
            </div>
          </div>
        )}

        <FormField label="Statement period date" required>
          <FormInput
            type="date"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
          />
        </FormField>

        <FormField label="Description" required>
          <FormTextarea
            rows={2}
            placeholder={isFuel ? 'e.g. Diesel fill — I-80' : 'e.g. Cash advance'}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </FormField>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isRecurring}
            onChange={(e) => set('isRecurring', e.target.checked)}
            className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-blue-500/20"
          />
          <span className="text-sm text-gray-300">Recurring deduction</span>
        </label>
      </div>

      <ModalFooter>
        <button type="button" onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        <button type="button" onClick={handleSubmit} disabled={loading} className="btn btn-primary">
          {loading ? (isEdit ? 'Saving...' : 'Adding...') : isEdit ? 'Save Changes' : 'Add Deduction'}
        </button>
      </ModalFooter>
    </Modal>
  );
}
