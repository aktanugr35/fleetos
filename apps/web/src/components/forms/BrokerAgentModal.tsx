'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { FormField, FormInput, FormTextarea } from '@/components/ui/FormElements';
import { getApiErrorMessage } from '@/lib/api-errors';
import api from '@/lib/api';

export interface BrokerAgent {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes?: string | null;
  isActive: boolean;
}

interface BrokerAgentModalProps {
  isOpen: boolean;
  brokerId: string;
  agent?: BrokerAgent | null;
  onClose: () => void;
  onSuccess: () => void;
}

const emptyForm = { name: '', email: '', phone: '', notes: '' };

export function BrokerAgentModal({
  isOpen,
  brokerId,
  agent,
  onClose,
  onSuccess,
}: BrokerAgentModalProps) {
  const isEdit = Boolean(agent);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setForm(
      agent
        ? {
            name: agent.name,
            email: agent.email || '',
            phone: agent.phone || '',
            notes: agent.notes || '',
          }
        : emptyForm,
    );
  }, [isOpen, agent]);

  const set = (key: keyof typeof emptyForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrors({ name: 'Required' });
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    setSaving(true);
    setErrors({});
    try {
      if (isEdit) {
        await api.patch(`/brokers/${brokerId}/agents/${agent!.id}`, payload);
      } else {
        await api.post(`/brokers/${brokerId}/agents`, payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setErrors({ _form: getApiErrorMessage(err, 'Could not save agent') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit agent' : 'Add agent'} size="sm">
      <form onSubmit={handleSubmit}>
        {errors._form ? <p className="text-red-400 text-sm mb-4">{errors._form}</p> : null}
        <div className="space-y-4">
          <FormField label="Agent name" required error={errors.name}>
            <FormInput
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Mike Ross"
              error={!!errors.name}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email">
              <FormInput
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </FormField>
            <FormField label="Phone">
              <FormInput value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </FormField>
          </div>
          <FormField label="Notes">
            <FormTextarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
          </FormField>
        </div>
        <ModalFooter>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add agent'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
