'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { FormField, FormInput, FormTextarea } from '@/components/ui/FormElements';
import { getApiErrorMessage } from '@/lib/api-errors';
import api from '@/lib/api';

interface CreateBrokerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  brokerId?: string | null;
}

const emptyForm = {
  name: '',
  mcNumber: '',
  address: '',
  notes: '',
};

export function CreateBrokerModal({
  isOpen,
  onClose,
  onSuccess,
  brokerId,
}: CreateBrokerModalProps) {
  const isEdit = Boolean(brokerId);
  const [loading, setLoading] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    if (!brokerId) {
      setForm(emptyForm);
      return;
    }

    setLoadingRecord(true);
    api
      .get(`/brokers/${brokerId}`)
      .then((res) => {
        const b = res.data.data;
        setForm({
          name: b.name || '',
          mcNumber: b.mcNumber || '',
          address: b.address || '',
          notes: b.notes || '',
        });
      })
      .catch(() => setErrors({ _form: 'Could not load broker' }))
      .finally(() => setLoadingRecord(false));
  }, [isOpen, brokerId]);

  const set = (key: keyof typeof emptyForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const mcDigits = form.mcNumber.replace(/\D/g, '');
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = 'Required';
    if (mcDigits.length < 3) nextErrors.mcNumber = 'Enter a valid MC number';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = {
      name: form.name.trim(),
      mcNumber: mcDigits,
      address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    setLoading(true);
    try {
      if (isEdit) {
        await api.patch(`/brokers/${brokerId}`, payload);
      } else {
        await api.post('/brokers', payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setErrors({ _form: getApiErrorMessage(err, 'Could not save broker') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Broker' : 'Add Broker'} size="md">
      <form onSubmit={handleSubmit}>
        {errors._form ? <p className="text-red-400 text-sm mb-4">{errors._form}</p> : null}
        {loadingRecord ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Broker name" required error={errors.name}>
                <FormInput
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Total Quality Logistics"
                  error={!!errors.name}
                />
              </FormField>
              <FormField label="MC number" required error={errors.mcNumber}>
                <FormInput
                  value={form.mcNumber}
                  onChange={(e) => set('mcNumber', e.target.value)}
                  placeholder="e.g. 123456"
                  error={!!errors.mcNumber}
                />
              </FormField>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Add the people you book with as agents on the broker page — each load can then be
              credited to the agent who gave it to you.
            </p>
            <FormField label="Address">
              <FormInput value={form.address} onChange={(e) => set('address', e.target.value)} />
            </FormField>
            <FormField label="Notes">
              <FormTextarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={3}
              />
            </FormField>
          </div>
        )}
        <ModalFooter>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading || loadingRecord}>
            {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Add broker'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
