'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { FormField, FormInput, FormSelect, FormTextarea } from '@/components/ui/FormElements';
import { FormTimeInput } from '@/components/ui/FormTimeInput';
import { formatCurrency } from '@/lib/utils';
import { combineDateAndTime24, splitIsoToDateAndTime24 } from '@/lib/us-time';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';

function splitDateTime(iso: string | Date | null | undefined) {
  return splitIsoToDateAndTime24(iso);
}

const EMPTY_FORM = {
  driverId: '', bookedByDispatcherId: '', truckId: '', trailerId: '', trailerMode: 'company' as 'company' | 'hook_drop',
  externalTrailerRef: '',
  brokerName: '', brokerMC: '', brokerContact: '',
  pickupZip: '', pickupAddress: '', pickupCity: '', pickupState: 'TX', pickupDate: '', pickupTime: '08:00',
  deliveryZip: '', deliveryAddress: '', deliveryCity: '', deliveryState: 'IL', deliveryDate: '', deliveryTime: '17:00',
  commodity: '', weight: '', loadedMiles: '', deadheadMiles: '',
  rateCents: '', detentionCents: '0', lumperCents: '0',
  status: 'PENDING',
  notes: '',
};

interface CreateLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  loadId?: string | null;
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
].map(s => ({ value: s, label: s }));

interface Driver { id: string; firstName: string; lastName: string; }
interface Dispatcher { id: string; firstName: string; lastName: string; }
interface Truck {
  id: string;
  unitNumber: string;
  ownerDriverId?: string | null;
}
interface TruckApiResponse {
  id: string;
  unitNumber: string;
  ownerDriver?: { id?: string | null } | null;
  ownerDriverId?: string | null;
}
interface Trailer { id: string; unitNumber: string; }

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending / Planned' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'DELIVERED', label: 'Delivered / Ready for Settlement' },
  { value: 'TONU', label: 'TONU' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function CreateLoadModal({ isOpen, onClose, onSuccess, loadId = null }: CreateLoadModalProps) {
  const isEdit = Boolean(loadId);
  const [loading, setLoading] = useState(false);
  const [fetchingLoad, setFetchingLoad] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [loadNumber, setLoadNumber] = useState('');
  const [onSettlement, setOnSettlement] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);

  const [rateConfirmationFile, setRateConfirmationFile] = useState<File | null>(null);
  const [autoTruckId, setAutoTruckId] = useState<string | null>(null);
  const [zipLookup, setZipLookup] = useState<{ pickup: boolean; delivery: boolean }>({
    pickup: false,
    delivery: false,
  });

  useEffect(() => {
    if (!isOpen) {
      setForm(EMPTY_FORM);
      setLoadNumber('');
      setOnSettlement(false);
      setRateConfirmationFile(null);
      setAutoTruckId(null);
      setErrors({});
      return;
    }

    Promise.all([
      api.get(loadId ? '/drivers?status=all&limit=200' : '/drivers?status=active&limit=200'),
      api.get('/dispatchers?status=active&limit=200'),
      api.get('/trucks?status=active&limit=200'),
      api.get('/trailers'),
    ]).then(([d, disp, t, tr]) => {
      setDrivers(d.data.data);
      setDispatchers(disp.data.data);
      const normalizedTrucks: Truck[] = ((t.data.data || []) as TruckApiResponse[]).map((truck) => ({
        id: truck.id,
        unitNumber: truck.unitNumber,
        ownerDriverId: truck.ownerDriver?.id ?? truck.ownerDriverId ?? null,
      }));
      setTrucks(normalizedTrucks);
      setTrailers(tr.data.data);
    }).catch(() => {});

    if (!loadId) return;

    setFetchingLoad(true);
    api.get(`/loads/${loadId}`)
      .then((res) => {
        const load = res.data.data;
        const pickup = splitDateTime(load.pickupDate);
        const delivery = splitDateTime(load.deliveryDate);
        setLoadNumber(load.loadNumber || '');
        setOnSettlement((load.settlementLineCount ?? 0) > 0);
        setAutoTruckId(null);
        setForm({
          driverId: load.driverId || load.driver?.id || '',
          bookedByDispatcherId: load.bookedByDispatcherId || load.bookedByDispatcher?.id || '',
          truckId: load.truckId || load.truck?.id || '',
          trailerId: load.trailerId || '',
          trailerMode: load.externalTrailerRef ? 'hook_drop' : 'company',
          externalTrailerRef: load.externalTrailerRef || '',
          brokerName: load.brokerName || '',
          brokerMC: load.brokerMC || '',
          brokerContact: load.referenceNumber || '',
          pickupZip: '',
          pickupAddress: load.pickupLocation || '',
          pickupCity: load.pickupCity || '',
          pickupState: load.pickupState || 'TX',
          pickupDate: pickup.date,
          pickupTime: pickup.time24,
          deliveryZip: '',
          deliveryAddress: load.deliveryLocation || '',
          deliveryCity: load.deliveryCity || '',
          deliveryState: load.deliveryState || 'IL',
          deliveryDate: delivery.date,
          deliveryTime: delivery.time24,
          commodity: '',
          weight: '',
          loadedMiles: String(load.loadedMiles ?? 0),
          deadheadMiles: String(load.deadheadMiles ?? 0),
          rateCents: ((load.rateTotal || 0) / 100).toFixed(2),
          detentionCents: ((load.detentionPay || 0) / 100).toFixed(2),
          lumperCents: ((load.lumperFee || 0) / 100).toFixed(2),
          status: load.status || 'PENDING',
          notes: load.notes || '',
        });
      })
      .catch(() => {
        setErrors({ _form: 'Failed to load details' });
      })
      .finally(() => setFetchingLoad(false));
  }, [isOpen, loadId]);

  const set = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const findAssignedTruck = (driverId: string) =>
    trucks.find((truck) => truck.ownerDriverId === driverId) || null;

  const handleDriverChange = (driverId: string) => {
    const assigned = findAssignedTruck(driverId);
    setForm((prev) => {
      const nextTruckId = assigned?.id ?? (
        autoTruckId && prev.truckId === autoTruckId ? '' : prev.truckId
      );
      return { ...prev, driverId, truckId: nextTruckId };
    });
    setAutoTruckId(assigned?.id ?? null);
    setErrors((prev) => ({ ...prev, driverId: '', truckId: '' }));
  };

  const handleTruckChange = (truckId: string) => {
    setAutoTruckId(null); // manual override should stay as selected
    set('truckId', truckId);
  };

  const lookupZip = async (kind: 'pickup' | 'delivery') => {
    const zip = form[kind === 'pickup' ? 'pickupZip' : 'deliveryZip'].replace(/\D/g, '').slice(0, 5);
    if (zip.length !== 5) {
      setErrors(prev => ({
        ...prev,
        [kind === 'pickup' ? 'pickupZip' : 'deliveryZip']: 'Enter a 5-digit ZIP code',
      }));
      return;
    }

    setZipLookup(prev => ({ ...prev, [kind]: true }));
    try {
      const res = await api.get(`/geo/zip/${zip}`);
      const { city, state } = res.data.data as { city: string; state: string };
      if (kind === 'pickup') {
        setForm(prev => ({
          ...prev,
          pickupZip: zip,
          pickupCity: city,
          pickupState: state,
          pickupAddress: `${city}, ${state} ${zip}`,
        }));
        setErrors(prev => ({ ...prev, pickupZip: '', pickupCity: '' }));
      } else {
        setForm(prev => ({
          ...prev,
          deliveryZip: zip,
          deliveryCity: city,
          deliveryState: state,
          deliveryAddress: `${city}, ${state} ${zip}`,
        }));
        setErrors(prev => ({ ...prev, deliveryZip: '', deliveryCity: '' }));
      }
    } catch (err) {
      setErrors(prev => ({
        ...prev,
        [kind === 'pickup' ? 'pickupZip' : 'deliveryZip']: getApiErrorMessage(err, 'ZIP code not found'),
      }));
    } finally {
      setZipLookup(prev => ({ ...prev, [kind]: false }));
    }
  };

  const setDeliveryDate = (value: string) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const deliveryDate = value ? new Date(value) : null;

    setForm(prev => ({
      ...prev,
      deliveryDate: value,
      status: deliveryDate && deliveryDate <= today ? 'DELIVERED' : prev.status === 'DELIVERED' ? 'PENDING' : prev.status,
    }));
    setErrors(prev => ({ ...prev, deliveryDate: '' }));
  };

  const calcRevenue = () => {
    const rate = parseFloat(form.rateCents) || 0;
    const detention = parseFloat(form.detentionCents) || 0;
    const lumper = parseFloat(form.lumperCents) || 0;
    return rate + detention + lumper;
  };

  const calcRPM = () => {
    const rate = parseFloat(form.rateCents) || 0;
    const lm = parseInt(form.loadedMiles) || 0;
    const dm = parseInt(form.deadheadMiles) || 0;
    const totalMiles = lm + dm;
    if (totalMiles === 0) return 0;
    return rate / totalMiles;
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.driverId) e.driverId = 'Required';
    if (!form.bookedByDispatcherId) e.bookedByDispatcherId = 'Required';
    if (!form.truckId) e.truckId = 'Required';
    if (!form.brokerName.trim()) e.brokerName = 'Required';
    if (!form.pickupCity.trim()) e.pickupCity = 'Required';
    if (!form.deliveryCity.trim()) e.deliveryCity = 'Required';
    if (!form.pickupDate) e.pickupDate = 'Required';
    if (!form.deliveryDate) e.deliveryDate = 'Required';
    if (form.trailerMode === 'hook_drop' && !form.externalTrailerRef.trim()) {
      e.externalTrailerRef = 'Enter hook & drop trailer ID or description';
    }
    if (!form.loadedMiles && !form.deadheadMiles) {
      e.loadedMiles = 'Required';
    }
    if (!form.rateCents || parseFloat(form.rateCents) <= 0) e.rateCents = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      let documentId;
      if (rateConfirmationFile) {
        const formData = new FormData();
        formData.append('file', rateConfirmationFile);
        formData.append('type', 'RATE_CONFIRMATION');
        const uploadRes = await api.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        documentId = uploadRes.data.data.id;
      }

      const pickupIso = combineDateAndTime24(form.pickupDate, form.pickupTime);
      const deliveryIso = combineDateAndTime24(form.deliveryDate, form.deliveryTime);

      const payload = {
        driverId: form.driverId,
        bookedByDispatcherId: form.bookedByDispatcherId,
        truckId: form.truckId,
        trailerId: form.trailerMode === 'company' ? form.trailerId || null : null,
        externalTrailerRef:
          form.trailerMode === 'hook_drop' ? form.externalTrailerRef.trim() : null,
        brokerName: form.brokerName,
        brokerMC: form.brokerMC || undefined,
        brokerContact: form.brokerContact || undefined,
        pickupAddress: form.pickupAddress || form.pickupCity,
        pickupCity: form.pickupCity,
        pickupState: form.pickupState,
        pickupDate: pickupIso,
        deliveryAddress: form.deliveryAddress || form.deliveryCity,
        deliveryCity: form.deliveryCity,
        deliveryState: form.deliveryState,
        deliveryDate: deliveryIso,
        status: form.status,
        actualDeliveryDate: form.status === 'DELIVERED' ? deliveryIso : undefined,
        commodity: form.commodity || undefined,
        weight: form.weight ? parseInt(form.weight) : undefined,
        loadedMiles: parseInt(form.loadedMiles) || 0,
        deadheadMiles: parseInt(form.deadheadMiles) || 0,
        rateType: 'FLAT' as const,
        rateCents: Math.round(parseFloat(form.rateCents) * 100),
        detentionCents: Math.round(parseFloat(form.detentionCents || '0') * 100),
        lumperCents: Math.round(parseFloat(form.lumperCents || '0') * 100),
        notes: form.notes || undefined,
      };

      if (isEdit && loadId) {
        await api.patch(`/loads/${loadId}`, {
          ...payload,
          rateConfirmationDocumentId: documentId,
        });
      } else {
        await api.post('/loads', {
          ...payload,
          rateConfirmationDocumentId: documentId,
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setErrors({
        _form: getApiErrorMessage(err, isEdit ? 'Failed to update load' : 'Failed to create load'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Load${loadNumber ? ` — ${loadNumber}` : ''}` : 'Create New Load'}
      description={isEdit ? 'Update dispatch, route, rate, or driver assignment' : 'Enter load and dispatch details'}
      size="xl"
    >
      {errors._form && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">{errors._form}</div>
      )}

      {fetchingLoad ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
      {onSettlement && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-200">
          This load is on a settlement statement. Changes here do not update past statements — regenerate the PDF if needed.
        </div>
      )}

      {/* Assignment */}
      <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">Assignment</h4>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Driver" required error={errors.driverId}>
          <FormSelect value={form.driverId} onChange={(e) => handleDriverChange(e.target.value)} error={!!errors.driverId}
            placeholder="Select driver" options={drivers.map(d => ({ value: d.id, label: `${d.firstName} ${d.lastName}` }))} />
        </FormField>
        <FormField label="Booked By" required error={errors.bookedByDispatcherId}>
          <FormSelect
            value={form.bookedByDispatcherId}
            onChange={(e) => set('bookedByDispatcherId', e.target.value)}
            error={!!errors.bookedByDispatcherId}
            placeholder="Select dispatcher"
            options={dispatchers.map((d) => ({ value: d.id, label: `${d.firstName} ${d.lastName}` }))}
          />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-3">
        <FormField label="Truck" required error={errors.truckId}>
          <FormSelect value={form.truckId} onChange={(e) => handleTruckChange(e.target.value)} error={!!errors.truckId}
            placeholder="Select truck" options={trucks.map(t => ({ value: t.id, label: t.unitNumber }))} />
        </FormField>
        <FormField label="Trailer">
          <FormSelect
            value={form.trailerMode}
            onChange={(e) => set('trailerMode', e.target.value)}
            options={[
              { value: 'company', label: 'Company trailer' },
              { value: 'hook_drop', label: 'Hook & drop (external)' },
            ]}
          />
        </FormField>
      </div>
      <div className="grid grid-cols-1 gap-4 mt-3">
        {form.trailerMode === 'company' ? (
          <FormField label="Company trailer">
            <FormSelect
              value={form.trailerId}
              onChange={(e) => set('trailerId', e.target.value)}
              placeholder="Select trailer (optional)"
              options={[{ value: '', label: '— None —' }, ...trailers.map((t) => ({ value: t.id, label: t.unitNumber }))]}
            />
          </FormField>
        ) : (
          <FormField label="External trailer ID / description" required error={errors.externalTrailerRef}>
            <FormInput
              value={form.externalTrailerRef}
              onChange={(e) => set('externalTrailerRef', e.target.value)}
              placeholder="Trailer ID or description"
              error={!!errors.externalTrailerRef}
            />
          </FormField>
        )}
      </div>

      {/* Broker */}
      <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mt-6 mb-3">Broker Information</h4>
      <div className="grid grid-cols-3 gap-4">
        <FormField label="Broker Name" required error={errors.brokerName}>
          <FormInput value={form.brokerName} onChange={(e) => set('brokerName', e.target.value)} placeholder="Broker name" error={!!errors.brokerName} />
        </FormField>
        <FormField label="MC Number">
          <FormInput value={form.brokerMC} onChange={(e) => set('brokerMC', e.target.value)} placeholder="MC number" />
        </FormField>
        <FormField label="Contact">
          <FormInput value={form.brokerContact} onChange={(e) => set('brokerContact', e.target.value)} placeholder="Contact name" />
        </FormField>
      </div>

      {/* Route */}
      <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mt-6 mb-3">Route</h4>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> <span className="text-xs text-green-400 font-medium">PICKUP</span>
          </div>
          <FormField label="ZIP Code">
            <div className="flex gap-2">
              <FormInput
                value={form.pickupZip}
                onChange={(e) => set('pickupZip', e.target.value.replace(/\D/g, '').slice(0, 5))}
                onBlur={() => {
                  if (form.pickupZip.replace(/\D/g, '').length === 5) {
                    void lookupZip('pickup');
                  }
                }}
                placeholder="ZIP code"
                inputMode="numeric"
                error={!!errors.pickupZip}
              />
              <button
                type="button"
                className="btn btn-secondary shrink-0 px-3"
                disabled={zipLookup.pickup}
                onClick={() => void lookupZip('pickup')}
              >
                {zipLookup.pickup ? '...' : 'Lookup'}
              </button>
            </div>
            {errors.pickupZip ? <p className="text-xs text-red-400 mt-1">{errors.pickupZip}</p> : null}
          </FormField>
          <FormField label="City" required error={errors.pickupCity}>
            <FormInput value={form.pickupCity} onChange={(e) => set('pickupCity', e.target.value)} placeholder="City" error={!!errors.pickupCity} />
          </FormField>
          <FormField label="State" required>
            <FormSelect value={form.pickupState} onChange={(e) => set('pickupState', e.target.value)} options={US_STATES} />
          </FormField>
          <FormField label="Street / facility (optional)">
            <FormInput
              value={form.pickupAddress}
              onChange={(e) => set('pickupAddress', e.target.value)}
              placeholder="Street address or facility name"
            />
          </FormField>
          <FormField label="Date" required error={errors.pickupDate}>
            <FormInput type="date" value={form.pickupDate} onChange={(e) => set('pickupDate', e.target.value)} error={!!errors.pickupDate} />
          </FormField>
          <FormField label="Time (ET)">
            <FormTimeInput value={form.pickupTime} onChange={(value) => set('pickupTime', value)} />
          </FormField>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> <span className="text-xs text-red-400 font-medium">DELIVERY</span>
          </div>
          <FormField label="ZIP Code">
            <div className="flex gap-2">
              <FormInput
                value={form.deliveryZip}
                onChange={(e) => set('deliveryZip', e.target.value.replace(/\D/g, '').slice(0, 5))}
                onBlur={() => {
                  if (form.deliveryZip.replace(/\D/g, '').length === 5) {
                    void lookupZip('delivery');
                  }
                }}
                placeholder="ZIP code"
                inputMode="numeric"
                error={!!errors.deliveryZip}
              />
              <button
                type="button"
                className="btn btn-secondary shrink-0 px-3"
                disabled={zipLookup.delivery}
                onClick={() => void lookupZip('delivery')}
              >
                {zipLookup.delivery ? '...' : 'Lookup'}
              </button>
            </div>
            {errors.deliveryZip ? <p className="text-xs text-red-400 mt-1">{errors.deliveryZip}</p> : null}
          </FormField>
          <FormField label="City" required error={errors.deliveryCity}>
            <FormInput value={form.deliveryCity} onChange={(e) => set('deliveryCity', e.target.value)} placeholder="City" error={!!errors.deliveryCity} />
          </FormField>
          <FormField label="State" required>
            <FormSelect value={form.deliveryState} onChange={(e) => set('deliveryState', e.target.value)} options={US_STATES} />
          </FormField>
          <FormField label="Street / facility (optional)">
            <FormInput
              value={form.deliveryAddress}
              onChange={(e) => set('deliveryAddress', e.target.value)}
              placeholder="Street address or facility name"
            />
          </FormField>
          <FormField label="Date" required error={errors.deliveryDate}>
            <FormInput type="date" value={form.deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} error={!!errors.deliveryDate} />
          </FormField>
          <FormField label="Time (ET)">
            <FormTimeInput value={form.deliveryTime} onChange={(value) => set('deliveryTime', value)} />
          </FormField>
        </div>
      </div>

      <div className="mt-4">
        <FormField label={isEdit ? 'Status' : 'Initial Status'}>
          <FormSelect
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
            options={STATUS_OPTIONS}
          />
        </FormField>
        <p className="text-xs text-gray-500 mt-1">
          Past or today delivery dates are marked as Delivered by default so historical loads can be settled immediately.
        </p>
      </div>

      {/* Rate */}
      <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mt-6 mb-3">Rate & Charges</h4>
      <div className="grid grid-cols-4 gap-4">
        <FormField label="Loaded Miles" required error={errors.loadedMiles}>
          <FormInput type="number" value={form.loadedMiles} onChange={(e) => set('loadedMiles', e.target.value)} placeholder="Loaded miles" error={!!errors.loadedMiles} />
        </FormField>
        <FormField label="Deadhead Miles">
          <FormInput type="number" value={form.deadheadMiles} onChange={(e) => set('deadheadMiles', e.target.value)} placeholder="Deadhead miles" />
        </FormField>
        <div className="flex flex-col justify-end pb-2">
          <span className="text-xs text-gray-400">Total: <strong className="text-white">{(parseInt(form.loadedMiles) || 0) + (parseInt(form.deadheadMiles) || 0)}</strong> mi</span>
        </div>
        <FormField label="Gross Rate ($)" required error={errors.rateCents}>
          <FormInput type="number" step="0.01" value={form.rateCents} onChange={(e) => set('rateCents', e.target.value)}
            placeholder="0.00" error={!!errors.rateCents} />
        </FormField>
        <div className="flex items-end gap-2 col-span-2">
          <div className="card py-2 px-3 text-center w-full bg-blue-500/5 border border-blue-500/10">
            <p className="text-[10px] text-gray-500 uppercase">RPM</p>
            <p className="text-lg font-bold text-blue-400">${calcRPM().toFixed(2)}</p>
          </div>
          <div className="card py-2 px-3 text-center w-full">
            <p className="text-[10px] text-gray-500 uppercase">Total Revenue</p>
            <p className="text-lg font-bold text-green-400">{formatCurrency(Math.round(calcRevenue() * 100))}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mt-3">
        <FormField label="Detention ($)">
          <FormInput type="number" step="0.01" value={form.detentionCents} onChange={(e) => set('detentionCents', e.target.value)} />
        </FormField>
        <FormField label="Lumper ($)">
          <FormInput type="number" step="0.01" value={form.lumperCents} onChange={(e) => set('lumperCents', e.target.value)} />
        </FormField>
        <FormField label="Commodity">
          <FormInput value={form.commodity} onChange={(e) => set('commodity', e.target.value)} placeholder="Commodity" />
        </FormField>
      </div>

      <FormField label="Notes" className="mt-4">
        <FormTextarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Notes" />
      </FormField>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">Rate Confirmation (PDF)</label>
        <input type="file" accept="application/pdf,image/*" onChange={(e) => setRateConfirmationFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20" />
      </div>

      <ModalFooter>
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={loading || fetchingLoad} className="btn btn-primary">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              {isEdit ? 'Saving...' : 'Creating...'}
            </span>
          ) : isEdit ? (
            'Save Changes'
          ) : (
            'Create Load'
          )}
        </button>
      </ModalFooter>
        </>
      )}
    </Modal>
  );
}
