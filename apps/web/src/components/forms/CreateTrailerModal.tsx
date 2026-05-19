'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { FormField, FormInput, FormSelect } from '@/components/ui/FormElements';
import { getApiErrorMessage } from '@/lib/api-errors';
import { toDateInputValue } from '@/lib/utils';
import api from '@/lib/api';

interface CreateTrailerModalProps {
  isOpen: boolean;
  trailerId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
].map(s => ({ value: s, label: s }));

const emptyForm = () => ({
  unitNumber: '',
  make: '',
  model: '',
  year: '',
  vin: '',
  licensePlate: '',
  plateState: 'TX',
  dotInspectionExpiry: '',
  irpExpiry: '',
});

export function CreateTrailerModal({ isOpen, trailerId, onClose, onSuccess }: CreateTrailerModalProps) {
  const isEdit = Boolean(trailerId);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    if (!isOpen) return;
    if (trailerId) {
      setFetching(true);
      api
        .get(`/trailers/${trailerId}`)
        .then((r) => {
          const t = r.data.data;
          setForm({
            unitNumber: t.unitNumber || '',
            make: t.make || '',
            model: t.model || '',
            year: t.year ? String(t.year) : '',
            vin: t.vin || '',
            licensePlate: t.licensePlate || '',
            plateState: t.plateState || 'TX',
            dotInspectionExpiry: toDateInputValue(t.dotInspectionExpiry),
            irpExpiry: toDateInputValue(t.irpExpiry),
          });
        })
        .catch(() => setErrors({ _form: 'Failed to load trailer' }))
        .finally(() => setFetching(false));
    } else {
      setForm(emptyForm());
      setErrors({});
    }
  }, [isOpen, trailerId]);

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.unitNumber.trim()) e.unitNumber = 'Required';
    if (!form.licensePlate.trim()) e.licensePlate = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        unitNumber: form.unitNumber,
        make: form.make || undefined,
        model: form.model || undefined,
        year: form.year ? parseInt(form.year, 10) : undefined,
        vin: form.vin || undefined,
        licensePlate: form.licensePlate,
        plateState: form.plateState,
        dotInspectionExpiry: form.dotInspectionExpiry || undefined,
        irpExpiry: form.irpExpiry || undefined,
      };
      if (isEdit && trailerId) {
        await api.patch(`/trailers/${trailerId}`, payload);
      } else {
        await api.post('/trailers', payload);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrors({ _form: getApiErrorMessage(err, isEdit ? 'Failed to update trailer' : 'Failed to create trailer') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Trailer' : 'Add New Trailer'}
      description="Trailer unit and registration details"
      size="lg"
    >
      {errors._form && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          {errors._form}
        </div>
      )}

      {fetching ? (
        <div className="flex justify-center py-12">
          <span className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Unit Number" required error={errors.unitNumber}>
              <FormInput value={form.unitNumber} onChange={(e) => set('unitNumber', e.target.value)} placeholder="TR-201" error={!!errors.unitNumber} />
            </FormField>
            <FormField label="Make">
              <FormInput value={form.make} onChange={(e) => set('make', e.target.value)} placeholder="Great Dane" />
            </FormField>
            <FormField label="Model">
              <FormInput value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="Flatbed" />
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <FormField label="Year">
              <FormInput type="number" value={form.year} onChange={(e) => set('year', e.target.value)} placeholder="2020" />
            </FormField>
            <FormField label="VIN">
              <FormInput value={form.vin} onChange={(e) => set('vin', e.target.value.toUpperCase())} placeholder="Optional" maxLength={17} />
            </FormField>
            <FormField label="Plate State" required>
              <FormSelect value={form.plateState} onChange={(e) => set('plateState', e.target.value)} options={US_STATES} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <FormField label="License Plate" required error={errors.licensePlate}>
              <FormInput value={form.licensePlate} onChange={(e) => set('licensePlate', e.target.value.toUpperCase())} error={!!errors.licensePlate} />
            </FormField>
            <FormField label="DOT Inspection Expiry">
              <FormInput type="date" value={form.dotInspectionExpiry} onChange={(e) => set('dotInspectionExpiry', e.target.value)} />
            </FormField>
            <FormField label="IRP Expiry">
              <FormInput type="date" value={form.irpExpiry} onChange={(e) => set('irpExpiry', e.target.value)} />
            </FormField>
          </div>
        </>
      )}

      <ModalFooter>
        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button type="button" onClick={() => void handleSubmit()} disabled={loading || fetching} className="btn btn-primary">
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Trailer'}
        </button>
      </ModalFooter>
    </Modal>
  );
}
