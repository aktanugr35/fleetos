'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { FormField, FormInput, FormTextarea } from '@/components/ui/FormElements';
import api from '@/lib/api';

interface CreateDispatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  dispatcherId?: string | null;
}

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  commissionRate: '2',
  notes: '',
};

export function CreateDispatcherModal({
  isOpen,
  onClose,
  onSuccess,
  dispatcherId,
}: CreateDispatcherModalProps) {
  const isEdit = Boolean(dispatcherId);
  const [loading, setLoading] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    if (!dispatcherId) {
      setForm(emptyForm);
      return;
    }

    setLoadingRecord(true);
    api
      .get(`/dispatchers/${dispatcherId}`)
      .then((res) => {
        const d = res.data.data;
        setForm({
          firstName: d.firstName || '',
          lastName: d.lastName || '',
          email: d.email || '',
          phone: d.phone || '',
          commissionRate: String((d.commissionRate || 0) / 100),
          notes: d.notes || '',
        });
      })
      .catch(() => setErrors({ _form: 'Could not load dispatcher' }))
      .finally(() => setLoadingRecord(false));
  }, [isOpen, dispatcherId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const commissionRate = Math.round(parseFloat(form.commissionRate || '0') * 100);
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setErrors({ _form: 'First and last name are required' });
      setLoading(false);
      return;
    }
    if (Number.isNaN(commissionRate) || commissionRate < 0) {
      setErrors({ commissionRate: 'Enter a valid commission %' });
      setLoading(false);
      return;
    }

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      commissionRate,
      notes: form.notes.trim() || undefined,
    };

    try {
      if (isEdit) {
        await api.patch(`/dispatchers/${dispatcherId}`, payload);
      } else {
        await api.post('/dispatchers', payload);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrors({ _form: 'Could not save dispatcher' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Dispatcher' : 'Add Dispatcher'}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        {errors._form ? <p className="text-red-400 text-sm mb-4">{errors._form}</p> : null}
        {loadingRecord ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="First name" required>
                <FormInput
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </FormField>
              <FormField label="Last name" required>
                <FormInput
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </FormField>
            </div>
            <FormField label="Email">
              <FormInput
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </FormField>
            <FormField label="Phone">
              <FormInput
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </FormField>
            <FormField label="Commission %" required error={errors.commissionRate}>
              <FormInput
                type="number"
                min="0"
                step="0.01"
                value={form.commissionRate}
                onChange={(e) => setForm((f) => ({ ...f, commissionRate: e.target.value }))}
              />
            </FormField>
            <FormField label="Notes">
              <FormTextarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </FormField>
          </div>
        )}
        <ModalFooter>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading || loadingRecord}>
            {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Add dispatcher'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
