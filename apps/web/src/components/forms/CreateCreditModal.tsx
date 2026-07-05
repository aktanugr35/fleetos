'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { FormField, FormInput, FormSelect, FormTextarea } from '@/components/ui/FormElements';
import api from '@/lib/api';
import { CreditRecord, toDateInputValue } from '@/lib/credits';

interface CreateCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  driverId?: string;
  driverName?: string;
  credit?: CreditRecord | null;
}

const CREDIT_TYPES = [
  { value: 'REIMBURSEMENT', label: 'Reimbursement' },
  { value: 'BONUS', label: 'Bonus' },
  { value: 'OTHER', label: 'Other' },
];

export function CreateCreditModal({
  isOpen,
  onClose,
  onSuccess,
  driverId: fixedDriverId,
  driverName,
  credit,
}: CreateCreditModalProps) {
  const isEdit = Boolean(credit?.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [drivers, setDrivers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);

  const [form, setForm] = useState({
    driverId: fixedDriverId || '',
    type: 'REIMBURSEMENT',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    isRecurring: false,
  });

  useEffect(() => {
    if (!isOpen) return;

    setError('');
    if (credit) {
      setForm({
        driverId: credit.driverId,
        type: credit.type,
        amount: (credit.amount / 100).toFixed(2),
        date: toDateInputValue(credit.date),
        description: credit.description,
        isRecurring: credit.isRecurring,
      });
    } else {
      setForm({
        driverId: fixedDriverId || '',
        type: 'REIMBURSEMENT',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        isRecurring: false,
      });
    }

    if (!fixedDriverId && !credit) {
      api.get('/drivers').then((res) => setDrivers(res.data.data)).catch(() => {});
    }
  }, [isOpen, fixedDriverId, credit]);

  const set = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async () => {
    if (!form.driverId) {
      setError('Please select a driver');
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!form.description.trim()) {
      setError('Description is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        driverId: form.driverId,
        type: form.type,
        amount: Math.round(parseFloat(form.amount) * 100),
        date: form.date,
        description: form.description.trim(),
        isRecurring: form.isRecurring,
      };
      if (isEdit && credit) {
        await api.patch(`/credits/${credit.id}`, payload);
      } else {
        await api.post('/credits', payload);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || (isEdit ? 'Failed to update credit' : 'Failed to add credit');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Credit' : 'Add Credit'}
      description={fixedDriverId ? 'Reimbursement or bonus for this driver.' : undefined}
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
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Driver</p>
            <p className="text-sm font-medium text-gray-100 mt-1">{driverName}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Type" required>
            <FormSelect
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
              options={CREDIT_TYPES}
            />
          </FormField>
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
        </div>

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
            placeholder="Description"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </FormField>
      </div>

      <ModalFooter>
        <button type="button" onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        <button type="button" onClick={handleSubmit} disabled={loading} className="btn btn-primary">
          {loading ? (isEdit ? 'Saving...' : 'Adding...') : isEdit ? 'Save Changes' : 'Add Credit'}
        </button>
      </ModalFooter>
    </Modal>
  );
}
