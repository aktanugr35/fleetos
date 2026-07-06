'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { FormField, FormInput, FormSelect } from '@/components/ui/FormElements';
import { getApiErrorMessage } from '@/lib/api-errors';
import { toDateInputValue } from '@/lib/utils';
import api from '@/lib/api';

interface CreateTruckModalProps {
  isOpen: boolean;
  truckId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
].map(s => ({ value: s, label: s }));

interface Driver { id: string; firstName: string; lastName: string; }

const emptyForm = () => ({
  unitNumber: '',
  make: '',
  model: '',
  year: new Date().getFullYear().toString(),
  vin: '',
  licensePlate: '',
  plateState: 'TX',
  ownerDriverId: '',
  dotInspectionExpiry: '',
  irpExpiry: '',
  hvutExpiry: '',
  insuranceExpiry: '',
});

export function CreateTruckModal({ isOpen, truckId, onClose, onSuccess }: CreateTruckModalProps) {
  const isEdit = Boolean(truckId);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    if (!isOpen) return;
    api.get('/drivers?status=active&limit=200').then(r => setDrivers(r.data.data)).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (truckId) {
      setFetching(true);
      api
        .get(`/trucks/${truckId}`)
        .then((r) => {
          const t = r.data.data;
          setForm({
            unitNumber: t.unitNumber || '',
            make: t.make || '',
            model: t.model || '',
            year: String(t.year || new Date().getFullYear()),
            vin: t.vin || '',
            licensePlate: t.licensePlate || '',
            plateState: t.plateState || 'TX',
            ownerDriverId: t.ownerDriver?.id || t.ownerDriverId || '',
            dotInspectionExpiry: toDateInputValue(t.dotInspectionExpiry),
            irpExpiry: toDateInputValue(t.irpExpiry),
            hvutExpiry: toDateInputValue(t.hvutExpiry),
            insuranceExpiry: toDateInputValue(t.insuranceExpiry),
          });
        })
        .catch(() => setErrors({ _form: 'Failed to load truck' }))
        .finally(() => setFetching(false));
    } else {
      setForm(emptyForm());
      setErrors({});
    }
  }, [isOpen, truckId]);

  const set = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.unitNumber.trim()) e.unitNumber = 'Required';
    if (!form.make.trim()) e.make = 'Required';
    if (!form.model.trim()) e.model = 'Required';
    if (!isEdit && (!form.vin.trim() || form.vin.length < 11)) e.vin = 'VIN must be 11-17 chars';
    if (!form.licensePlate.trim()) e.licensePlate = 'Required';
    if (!form.dotInspectionExpiry) e.dotInspectionExpiry = 'Required';
    if (!form.irpExpiry) e.irpExpiry = 'Required';
    if (!form.hvutExpiry) e.hvutExpiry = 'Required';
    if (!form.insuranceExpiry) e.insuranceExpiry = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        year: parseInt(form.year, 10),
        ownerDriverId: form.ownerDriverId || null,
      };
      if (isEdit && truckId) {
        await api.patch(`/trucks/${truckId}`, payload);
      } else {
        await api.post('/trucks', payload);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrors({ _form: getApiErrorMessage(err, isEdit ? 'Failed to update truck' : 'Failed to create truck') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Truck' : 'Add New Truck'}
      description="Enter vehicle information"
      size="lg"
    >
      {errors._form && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">{errors._form}</div>
      )}

      {fetching ? (
        <div className="flex justify-center py-12">
          <span className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Unit Number" required error={errors.unitNumber}>
              <FormInput value={form.unitNumber} onChange={(e) => set('unitNumber', e.target.value)} placeholder="Unit number" error={!!errors.unitNumber} />
            </FormField>
            <FormField label="Make" required error={errors.make}>
              <FormSelect value={form.make} onChange={(e) => set('make', e.target.value)} error={!!errors.make}
                placeholder="Select make" options={[
                  { value: 'Peterbilt', label: 'Peterbilt' }, { value: 'Kenworth', label: 'Kenworth' },
                  { value: 'Freightliner', label: 'Freightliner' }, { value: 'Volvo', label: 'Volvo' },
                  { value: 'International', label: 'International' }, { value: 'Mack', label: 'Mack' },
                  { value: 'Western Star', label: 'Western Star' },
                ]} />
            </FormField>
            <FormField label="Model" required error={errors.model}>
              <FormInput value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="Model" error={!!errors.model} />
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <FormField label="Year">
              <FormInput type="number" value={form.year} onChange={(e) => set('year', e.target.value)} />
            </FormField>
            <FormField label="VIN" required={!isEdit} error={errors.vin}>
              <FormInput value={form.vin} onChange={(e) => set('vin', e.target.value.toUpperCase())} placeholder="VIN" error={!!errors.vin} maxLength={17} disabled={isEdit} />
            </FormField>
            <FormField label="Owner Driver">
              <FormSelect value={form.ownerDriverId} onChange={(e) => set('ownerDriverId', e.target.value)}
                placeholder="Unassigned (remove driver assignment)"
                options={drivers.map(d => ({ value: d.id, label: `${d.firstName} ${d.lastName}` }))} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <FormField label="License Plate" required error={errors.licensePlate}>
              <FormInput value={form.licensePlate} onChange={(e) => set('licensePlate', e.target.value.toUpperCase())} placeholder="License plate" error={!!errors.licensePlate} />
            </FormField>
            <FormField label="Plate State" required>
              <FormSelect value={form.plateState} onChange={(e) => set('plateState', e.target.value)} options={US_STATES} />
            </FormField>
          </div>

          <h4 className="text-sm font-semibold text-gray-300 mt-6 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-blue-500/20 flex items-center justify-center text-[10px] text-blue-400">🛡</span>
            Compliance Dates
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="DOT Inspection Expiry" required error={errors.dotInspectionExpiry}>
              <FormInput type="date" value={form.dotInspectionExpiry} onChange={(e) => set('dotInspectionExpiry', e.target.value)} error={!!errors.dotInspectionExpiry} />
            </FormField>
            <FormField label="IRP Expiry" required error={errors.irpExpiry}>
              <FormInput type="date" value={form.irpExpiry} onChange={(e) => set('irpExpiry', e.target.value)} error={!!errors.irpExpiry} />
            </FormField>
            <FormField label="HVUT (2290) Expiry" required error={errors.hvutExpiry}>
              <FormInput type="date" value={form.hvutExpiry} onChange={(e) => set('hvutExpiry', e.target.value)} error={!!errors.hvutExpiry} />
            </FormField>
            <FormField label="Insurance Expiry" required error={errors.insuranceExpiry}>
              <FormInput type="date" value={form.insuranceExpiry} onChange={(e) => set('insuranceExpiry', e.target.value)} error={!!errors.insuranceExpiry} />
            </FormField>
          </div>
        </>
      )}

      <ModalFooter>
        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button type="button" onClick={() => void handleSubmit()} disabled={loading || fetching} className="btn btn-primary">
          {loading ? <span className="flex items-center gap-2"><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Saving...</span> : isEdit ? 'Save Changes' : 'Create Truck'}
        </button>
      </ModalFooter>
    </Modal>
  );
}
