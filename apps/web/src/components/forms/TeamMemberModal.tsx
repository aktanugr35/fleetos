'use client';

import { useEffect, useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { FormField, FormInput, FormSelect } from '@/components/ui/FormElements';
import { getUserRoleLabel } from '@fleetos/shared-types';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

interface DriverOption {
  id: string;
  firstName: string;
  lastName: string;
  userId: string | null;
}

interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  driver?: { id: string; firstName: string; lastName: string } | null;
}

interface TeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  member?: TeamMember | null;
}

const ROLE_OPTIONS = [
  { value: 'DISPATCHER', label: getUserRoleLabel('DISPATCHER') },
  { value: 'ACCOUNTING', label: getUserRoleLabel('ACCOUNTING') },
  { value: 'DRIVER', label: getUserRoleLabel('DRIVER') },
  { value: 'COMPANY_ADMIN', label: getUserRoleLabel('COMPANY_ADMIN') },
];

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'DISPATCHER',
  driverId: '',
  isActive: true,
};

export function TeamMemberModal({ isOpen, onClose, onSuccess, member }: TeamMemberModalProps) {
  const isEdit = Boolean(member);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isSelf = isEdit && member?.id === currentUserId;
  const [loading, setLoading] = useState(false);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    if (member) {
      setForm({
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        password: '',
        role: member.role,
        driverId: member.driver?.id || '',
        isActive: member.isActive,
      });
    } else {
      setForm(emptyForm);
    }
  }, [isOpen, member]);

  useEffect(() => {
    if (!isOpen || form.role !== 'DRIVER') return;
    api
      .get('/drivers?status=active&limit=200')
      .then((res) => setDrivers(res.data.data || []))
      .catch(() => setDrivers([]));
  }, [isOpen, form.role]);

  const setField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = 'First name is required';
    if (!form.lastName.trim()) next.lastName = 'Last name is required';
    if (!isEdit) {
      if (!form.email.trim()) next.email = 'Email is required';
      if (!form.password) next.password = 'Password is required';
      else if (form.password.length < 8) next.password = 'Password must be at least 8 characters';
    } else if (form.password && form.password.length < 8) {
      next.password = 'Password must be at least 8 characters';
    }
    if (form.role === 'DRIVER' && !form.driverId) {
      next.driverId = 'Select a driver profile to link';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      if (isEdit && member) {
        const payload: Record<string, unknown> = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
        };
        if (!isSelf) {
          payload.role = form.role;
          payload.isActive = form.isActive;
        }
        if (form.password) payload.password = form.password;
        if (form.role === 'DRIVER') payload.driverId = form.driverId;
        else if (!isSelf) payload.driverId = null;
        await api.patch(`/users/${member.id}`, payload);
      } else {
        await api.post('/users', {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          driverId: form.role === 'DRIVER' ? form.driverId : undefined,
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setErrors({ form: getApiErrorMessage(err, 'Failed to save team member') });
    } finally {
      setLoading(false);
    }
  };

  const driverOptions = drivers
    .filter((d) => !d.userId || d.userId === member?.id)
    .map((d) => ({
      value: d.id,
      label: `${d.firstName} ${d.lastName}`,
    }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Team Member' : 'Add Team Member'}
      description={isEdit ? 'Update role, profile, or reset password' : 'Create a login account for your company staff'}
      size="md"
    >
      <div className="space-y-4">
        {errors.form ? <p className="text-sm text-red-400">{errors.form}</p> : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="First Name" required error={errors.firstName}>
            <FormInput value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} placeholder="First name" />
          </FormField>
          <FormField label="Last Name" required error={errors.lastName}>
            <FormInput value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} placeholder="Last name" />
          </FormField>
        </div>
        <FormField label="Email" required={!isEdit} error={errors.email}>
          <FormInput
            type="email"
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            placeholder="Email address"
            disabled={isEdit}
          />
        </FormField>
        <FormField
          label={isEdit ? 'New Password' : 'Password'}
          required={!isEdit}
          error={errors.password}
        >
          <FormInput
            type="password"
            value={form.password}
            onChange={(e) => setField('password', e.target.value)}
            placeholder={isEdit ? 'Leave blank to keep current password' : 'Min 8 chars, upper, lower, number'}
            autoComplete="new-password"
          />
        </FormField>
        <FormField label="Role" required>
          <FormSelect
            value={form.role}
            onChange={(e) => setField('role', e.target.value)}
            options={ROLE_OPTIONS}
            disabled={isSelf}
          />
        </FormField>
        {form.role === 'DRIVER' ? (
          <FormField label="Linked Driver Profile" required error={errors.driverId}>
            <FormSelect
              value={form.driverId}
              onChange={(e) => setField('driverId', e.target.value)}
              options={driverOptions}
              placeholder="Select driver profile"
            />
          </FormField>
        ) : null}
        {isEdit ? (
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              disabled={isSelf}
              className="rounded border-gray-600"
            />
            Account is active
          </label>
        ) : null}
      </div>
      <ModalFooter>
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={() => void handleSubmit()} disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Account'}
        </button>
      </ModalFooter>
    </Modal>
  );
}
