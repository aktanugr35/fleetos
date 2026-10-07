'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { FormField, FormInput, FormSelect } from '@/components/ui/FormElements';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Toast } from '@/components/ui/Toast';
import { formatCurrency, formatDate, toDateInputValue } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api-errors';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/api';

interface TruckOption {
  id: string;
  unitNumber: string;
  make: string;
  model: string;
}

interface FuelCard {
  id: string;
  truckId: string;
  provider?: string | null;
  cardNumber: string;
  displayName?: string | null;
  isActive: boolean;
  truck: TruckOption;
}

interface TollDevice {
  id: string;
  truckId: string;
  provider?: string | null;
  deviceNumber: string;
  displayName?: string | null;
  isActive: boolean;
  truck: TruckOption;
}

interface FuelTransaction {
  id: string;
  date: string;
  fuelType?: 'DIESEL' | 'DEF';
  merchant?: string | null;
  gallons?: number | null;
  grossAmount: number;
  discount: number;
  netAmount: number;
  truck: { id: string; unitNumber: string };
  fuelCard: { id: string; cardNumber: string; displayName?: string | null; provider?: string | null };
  settlementFuelTransactions?: { settlementId: string }[];
}

interface TollTransaction {
  id: string;
  date: string;
  agency?: string | null;
  location?: string | null;
  description?: string | null;
  amount: number;
  truck: { id: string; unitNumber: string };
  tollDevice: { id: string; deviceNumber: string; displayName?: string | null; provider?: string | null };
  settlementTollTransactions?: { settlementId: string }[];
}

const today = () => new Date().toISOString().split('T')[0];
const emptyFuelTx = () => ({ fuelCardId: '', date: today(), fuelType: 'DIESEL', merchant: '', gallons: '', retailPrice: '', totalPaid: '' });
const emptyTollTx = () => ({ tollDeviceId: '', date: today(), agency: '', location: '', description: '', amount: '' });

function dollarsToCents(value: string): number {
  return Math.round((parseFloat(value) || 0) * 100);
}

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function isFuelApplied(tx: FuelTransaction): boolean {
  return (tx.settlementFuelTransactions?.length ?? 0) > 0;
}

function isTollApplied(tx: TollTransaction): boolean {
  return (tx.settlementTollTransactions?.length ?? 0) > 0;
}

export default function FuelTollPage() {
  const { can } = usePermission();
  const canEdit = can('financial:write');
  const [trucks, setTrucks] = useState<TruckOption[]>([]);
  const [fuelCards, setFuelCards] = useState<FuelCard[]>([]);
  const [tollDevices, setTollDevices] = useState<TollDevice[]>([]);
  const [fuelTransactions, setFuelTransactions] = useState<FuelTransaction[]>([]);
  const [tollTransactions, setTollTransactions] = useState<TollTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [editingFuelId, setEditingFuelId] = useState<string | null>(null);
  const [editingTollId, setEditingTollId] = useState<string | null>(null);
  const [fuelToDelete, setFuelToDelete] = useState<FuelTransaction | null>(null);
  const [tollToDelete, setTollToDelete] = useState<TollTransaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [fuelCardForm, setFuelCardForm] = useState({ truckId: '', provider: '', cardNumber: '', displayName: '' });
  const [tollDeviceForm, setTollDeviceForm] = useState({ truckId: '', provider: '', deviceNumber: '', displayName: '' });
  const [fuelTxForm, setFuelTxForm] = useState(emptyFuelTx);
  const [tollTxForm, setTollTxForm] = useState(emptyTollTx);

  const truckOptions = trucks.map((t) => ({ value: t.id, label: `${t.unitNumber} — ${t.make} ${t.model}` }));
  const fuelCardOptions = fuelCards.filter((c) => c.isActive).map((c) => ({
    value: c.id,
    label: `${c.displayName || c.provider || 'Fuel Card'} · ${c.cardNumber} · Truck ${c.truck.unitNumber}`,
  }));
  const tollDeviceOptions = tollDevices.filter((d) => d.isActive).map((d) => ({
    value: d.id,
    label: `${d.displayName || d.provider || 'Toll Device'} · ${d.deviceNumber} · Truck ${d.truck.unitNumber}`,
  }));

  const fuelCalc = useMemo(() => {
    const gallons = parseFloat(fuelTxForm.gallons) || 0;
    const price = parseFloat(fuelTxForm.retailPrice) || 0;
    const paidCents = dollarsToCents(fuelTxForm.totalPaid);
    const retailCents = Math.round(gallons * price * 100);
    const discountCents = retailCents - paidCents;
    let error: string | null = null;
    if (gallons <= 0 || price <= 0 || paidCents < 1) {
      error = 'Enter gallons, retail price per gallon, and the total you paid';
    } else if (discountCents < 0) {
      error = 'Total paid is higher than the retail total — check the numbers';
    }
    return { gallons, retailCents, paidCents, discountCents, error };
  }, [fuelTxForm.gallons, fuelTxForm.retailPrice, fuelTxForm.totalPaid]);

  const fuelTotal = useMemo(() => fuelTransactions.reduce((sum, tx) => sum + tx.netAmount, 0), [fuelTransactions]);
  const tollTotal = useMemo(() => tollTransactions.reduce((sum, tx) => sum + tx.amount, 0), [tollTransactions]);

  const load = async () => {
    setLoading(true);
    try {
      const [trucksRes, fuelCardsRes, tollDevicesRes, fuelTxRes, tollTxRes] = await Promise.all([
        api.get('/trucks?status=active&limit=500'),
        api.get('/fuel-cards'),
        api.get('/toll-devices'),
        api.get('/fuel-transactions'),
        api.get('/toll-transactions'),
      ]);
      setTrucks(trucksRes.data.data);
      setFuelCards(fuelCardsRes.data.data);
      setTollDevices(tollDevicesRes.data.data);
      setFuelTransactions(fuelTxRes.data.data);
      setTollTransactions(tollTxRes.data.data);
    } catch {
      setToast({ type: 'error', message: 'Failed to load fuel/toll data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const startEditFuel = (tx: FuelTransaction) => {
    if (isFuelApplied(tx)) return;
    setEditingFuelId(tx.id);
    setFuelTxForm({
      fuelCardId: tx.fuelCard.id,
      date: toDateInputValue(tx.date),
      fuelType: tx.fuelType === 'DEF' ? 'DEF' : 'DIESEL',
      merchant: tx.merchant || '',
      gallons: tx.gallons != null ? String(tx.gallons) : '',
      retailPrice: tx.gallons ? (tx.grossAmount / 100 / tx.gallons).toFixed(3) : '',
      totalPaid: centsToDollars(tx.netAmount),
    });
  };

  const cancelEditFuel = () => {
    setEditingFuelId(null);
    setFuelTxForm(emptyFuelTx());
  };

  const startEditToll = (tx: TollTransaction) => {
    if (isTollApplied(tx)) return;
    setEditingTollId(tx.id);
    setTollTxForm({
      tollDeviceId: tx.tollDevice.id,
      date: toDateInputValue(tx.date),
      agency: tx.agency || '',
      location: tx.location || '',
      description: tx.description || '',
      amount: centsToDollars(tx.amount),
    });
  };

  const cancelEditToll = () => {
    setEditingTollId(null);
    setTollTxForm(emptyTollTx());
  };

  const submitFuelCard = async () => {
    if (!fuelCardForm.truckId || !fuelCardForm.cardNumber.trim()) return;
    setSaving('fuel-card');
    try {
      await api.post('/fuel-cards', fuelCardForm);
      setFuelCardForm({ truckId: '', provider: '', cardNumber: '', displayName: '' });
      setToast({ type: 'success', message: 'Fuel card added' });
      await load();
    } catch (err) {
      setToast({ type: 'error', message: getApiErrorMessage(err, 'Could not add fuel card') });
    } finally {
      setSaving(null);
    }
  };

  const submitTollDevice = async () => {
    if (!tollDeviceForm.truckId || !tollDeviceForm.deviceNumber.trim()) return;
    setSaving('toll-device');
    try {
      await api.post('/toll-devices', tollDeviceForm);
      setTollDeviceForm({ truckId: '', provider: '', deviceNumber: '', displayName: '' });
      setToast({ type: 'success', message: 'Toll device added' });
      await load();
    } catch (err) {
      setToast({ type: 'error', message: getApiErrorMessage(err, 'Could not add toll device') });
    } finally {
      setSaving(null);
    }
  };

  const submitFuelTransaction = async () => {
    if (!fuelTxForm.fuelCardId || fuelCalc.error || fuelCalc.retailCents < 1) return;
    setSaving('fuel-tx');
    const payload = {
      fuelCardId: fuelTxForm.fuelCardId,
      date: fuelTxForm.date,
      fuelType: fuelTxForm.fuelType,
      merchant: fuelTxForm.merchant,
      gallons: fuelCalc.gallons,
      grossAmount: fuelCalc.retailCents,
      discount: fuelCalc.discountCents,
    };
    try {
      if (editingFuelId) {
        await api.patch(`/fuel-transactions/${editingFuelId}`, payload);
        setToast({ type: 'success', message: 'Fuel transaction updated' });
      } else {
        await api.post('/fuel-transactions', payload);
        setToast({ type: 'success', message: 'Fuel transaction added' });
      }
      cancelEditFuel();
      await load();
    } catch (err) {
      setToast({
        type: 'error',
        message: getApiErrorMessage(err, editingFuelId ? 'Could not update fuel transaction' : 'Could not add fuel transaction'),
      });
    } finally {
      setSaving(null);
    }
  };

  const submitTollTransaction = async () => {
    const amount = dollarsToCents(tollTxForm.amount);
    if (!tollTxForm.tollDeviceId || amount < 1) return;
    setSaving('toll-tx');
    const payload = {
      tollDeviceId: tollTxForm.tollDeviceId,
      date: tollTxForm.date,
      agency: tollTxForm.agency,
      location: tollTxForm.location,
      description: tollTxForm.description,
      amount,
    };
    try {
      if (editingTollId) {
        await api.patch(`/toll-transactions/${editingTollId}`, payload);
        setToast({ type: 'success', message: 'Toll transaction updated' });
      } else {
        await api.post('/toll-transactions', payload);
        setToast({ type: 'success', message: 'Toll transaction added' });
      }
      cancelEditToll();
      await load();
    } catch (err) {
      setToast({
        type: 'error',
        message: getApiErrorMessage(err, editingTollId ? 'Could not update toll transaction' : 'Could not add toll transaction'),
      });
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteFuel = async () => {
    if (!fuelToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/fuel-transactions/${fuelToDelete.id}`);
      if (editingFuelId === fuelToDelete.id) cancelEditFuel();
      setToast({ type: 'success', message: 'Fuel transaction deleted' });
      setFuelToDelete(null);
      await load();
    } catch (err) {
      setToast({ type: 'error', message: getApiErrorMessage(err, 'Could not delete fuel transaction') });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteToll = async () => {
    if (!tollToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/toll-transactions/${tollToDelete.id}`);
      if (editingTollId === tollToDelete.id) cancelEditToll();
      setToast({ type: 'success', message: 'Toll transaction deleted' });
      setTollToDelete(null);
      await load();
    } catch (err) {
      setToast({ type: 'error', message: getApiErrorMessage(err, 'Could not delete toll transaction') });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Fuel/Toll"
        description="Assign cards and toll devices to trucks, then enter transactions for automatic settlements"
      />

      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Fuel Cards</p>
          <p className="text-2xl font-bold text-gray-100 mt-1">{fuelCards.length}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Fuel Total</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{formatCurrency(fuelTotal)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Toll Total</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{formatCurrency(tollTotal)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {canEdit ? (
          <section className="card">
            <h2 className="font-semibold text-gray-100 mb-4">Assign Fuel Card</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Truck" required>
                <FormSelect value={fuelCardForm.truckId} placeholder="Select truck" options={truckOptions} onChange={(e) => setFuelCardForm((p) => ({ ...p, truckId: e.target.value }))} />
              </FormField>
              <FormField label="Card number / last 4" required>
                <FormInput value={fuelCardForm.cardNumber} onChange={(e) => setFuelCardForm((p) => ({ ...p, cardNumber: e.target.value }))} placeholder="Card number" />
              </FormField>
              <FormField label="Provider">
                <FormInput value={fuelCardForm.provider} onChange={(e) => setFuelCardForm((p) => ({ ...p, provider: e.target.value }))} placeholder="Provider" />
              </FormField>
              <FormField label="Display name">
                <FormInput value={fuelCardForm.displayName} onChange={(e) => setFuelCardForm((p) => ({ ...p, displayName: e.target.value }))} placeholder="Display name" />
              </FormField>
            </div>
            <button type="button" className="btn btn-primary w-full mt-4 sm:w-auto" disabled={saving === 'fuel-card'} onClick={() => void submitFuelCard()}>
              Add Fuel Card
            </button>
          </section>
        ) : null}

        {canEdit ? (
          <section className="card">
            <h2 className="font-semibold text-gray-100 mb-4">Assign Toll Device</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Truck" required>
                <FormSelect value={tollDeviceForm.truckId} placeholder="Select truck" options={truckOptions} onChange={(e) => setTollDeviceForm((p) => ({ ...p, truckId: e.target.value }))} />
              </FormField>
              <FormField label="Device / tag number" required>
                <FormInput value={tollDeviceForm.deviceNumber} onChange={(e) => setTollDeviceForm((p) => ({ ...p, deviceNumber: e.target.value }))} placeholder="Device number" />
              </FormField>
              <FormField label="Provider">
                <FormInput value={tollDeviceForm.provider} onChange={(e) => setTollDeviceForm((p) => ({ ...p, provider: e.target.value }))} placeholder="Provider" />
              </FormField>
              <FormField label="Display name">
                <FormInput value={tollDeviceForm.displayName} onChange={(e) => setTollDeviceForm((p) => ({ ...p, displayName: e.target.value }))} placeholder="Display name" />
              </FormField>
            </div>
            <button type="button" className="btn btn-primary w-full mt-4 sm:w-auto" disabled={saving === 'toll-device'} onClick={() => void submitTollDevice()}>
              Add Toll Device
            </button>
          </section>
        ) : null}

        {canEdit ? (
          <section className="card">
            <h2 className="font-semibold text-gray-100 mb-4">
              {editingFuelId ? 'Edit Fuel Transaction' : 'Add Fuel Transaction'}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Fuel card" required className="sm:col-span-2">
                <FormSelect value={fuelTxForm.fuelCardId} placeholder="Select fuel card" options={fuelCardOptions} onChange={(e) => setFuelTxForm((p) => ({ ...p, fuelCardId: e.target.value }))} />
              </FormField>
              <FormField label="Date" required>
                <FormInput type="date" value={fuelTxForm.date} onChange={(e) => setFuelTxForm((p) => ({ ...p, date: e.target.value }))} />
              </FormField>
              <FormField label="Type" required>
                <FormSelect
                  value={fuelTxForm.fuelType}
                  options={[
                    { value: 'DIESEL', label: 'Diesel' },
                    { value: 'DEF', label: 'DEF' },
                  ]}
                  onChange={(e) => setFuelTxForm((p) => ({ ...p, fuelType: e.target.value === 'DEF' ? 'DEF' : 'DIESEL' }))}
                />
              </FormField>
              <FormField label="Merchant">
                <FormInput value={fuelTxForm.merchant} onChange={(e) => setFuelTxForm((p) => ({ ...p, merchant: e.target.value }))} placeholder="Merchant" />
              </FormField>
              <FormField label="Gallons" required>
                <FormInput type="number" step="0.001" min="0" value={fuelTxForm.gallons} onChange={(e) => setFuelTxForm((p) => ({ ...p, gallons: e.target.value }))} placeholder="e.g. 120.5" />
              </FormField>
              <FormField label="Retail price per gallon ($)" required>
                <FormInput type="number" step="0.001" min="0" value={fuelTxForm.retailPrice} onChange={(e) => setFuelTxForm((p) => ({ ...p, retailPrice: e.target.value }))} placeholder="e.g. 3.899" />
              </FormField>
              <FormField label="Total paid on invoice ($)" required className="sm:col-span-2">
                <FormInput type="number" step="0.01" min="0" value={fuelTxForm.totalPaid} onChange={(e) => setFuelTxForm((p) => ({ ...p, totalPaid: e.target.value }))} placeholder="e.g. 410.25" />
              </FormField>
            </div>
            <div className="mt-4 rounded-lg border border-[var(--border-color)] p-3 text-sm space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Retail total</span>
                <span>{formatCurrency(fuelCalc.retailCents)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Paid</span>
                <span>{formatCurrency(fuelCalc.paidCents)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-gray-200">Discount</span>
                <span className={fuelCalc.discountCents < 0 ? 'text-red-400' : 'text-green-400'}>
                  {formatCurrency(fuelCalc.discountCents)}
                </span>
              </div>
              {fuelCalc.error && (fuelTxForm.gallons || fuelTxForm.retailPrice || fuelTxForm.totalPaid) ? (
                <p className="text-xs text-red-400 pt-1">{fuelCalc.error}</p>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary w-full sm:w-auto" disabled={saving === 'fuel-tx' || !fuelTxForm.fuelCardId || Boolean(fuelCalc.error)} onClick={() => void submitFuelTransaction()}>
                {editingFuelId ? 'Save Fuel Changes' : 'Add Fuel Transaction'}
              </button>
              {editingFuelId ? (
                <button type="button" className="btn btn-secondary w-full sm:w-auto" disabled={saving === 'fuel-tx'} onClick={cancelEditFuel}>
                  Cancel
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        {canEdit ? (
          <section className="card">
            <h2 className="font-semibold text-gray-100 mb-4">
              {editingTollId ? 'Edit Toll Transaction' : 'Add Toll Transaction'}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Toll device" required className="sm:col-span-2">
                <FormSelect value={tollTxForm.tollDeviceId} placeholder="Select toll device" options={tollDeviceOptions} onChange={(e) => setTollTxForm((p) => ({ ...p, tollDeviceId: e.target.value }))} />
              </FormField>
              <FormField label="Date" required>
                <FormInput type="date" value={tollTxForm.date} onChange={(e) => setTollTxForm((p) => ({ ...p, date: e.target.value }))} />
              </FormField>
              <FormField label="Agency">
                <FormInput value={tollTxForm.agency} onChange={(e) => setTollTxForm((p) => ({ ...p, agency: e.target.value }))} placeholder="Agency" />
              </FormField>
              <FormField label="Location">
                <FormInput value={tollTxForm.location} onChange={(e) => setTollTxForm((p) => ({ ...p, location: e.target.value }))} placeholder="Location" />
              </FormField>
              <FormField label="Amount ($)" required>
                <FormInput type="number" step="0.01" value={tollTxForm.amount} onChange={(e) => setTollTxForm((p) => ({ ...p, amount: e.target.value }))} />
              </FormField>
              <FormField label="Description" className="sm:col-span-2">
                <FormInput value={tollTxForm.description} onChange={(e) => setTollTxForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" />
              </FormField>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary w-full sm:w-auto" disabled={saving === 'toll-tx'} onClick={() => void submitTollTransaction()}>
                {editingTollId ? 'Save Toll Changes' : 'Add Toll Transaction'}
              </button>
              {editingTollId ? (
                <button type="button" className="btn btn-secondary w-full sm:w-auto" disabled={saving === 'toll-tx'} onClick={cancelEditToll}>
                  Cancel
                </button>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 mt-6 xl:grid-cols-2">
        <section className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-color)] font-semibold">Fuel Transactions</div>
          {loading ? (
            <div className="p-4 text-sm text-gray-500">Loading...</div>
          ) : fuelTransactions.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No fuel transactions yet.</div>
          ) : (
            <div className="divide-y divide-[var(--border-color)]">
              {fuelTransactions.map((tx) => {
                const applied = isFuelApplied(tx);
                return (
                  <div key={tx.id} className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-100">
                        {tx.fuelType === 'DEF' ? 'DEF' : 'Diesel'}
                        {tx.merchant ? ` · ${tx.merchant}` : ''}
                      </p>
                      <p className="text-xs text-gray-500">
                        Truck {tx.truck.unitNumber} · {formatDate(tx.date)}{tx.gallons ? ` · ${tx.gallons} gal` : ''}
                        {tx.discount > 0 ? ` · Saved ${formatCurrency(tx.discount)}` : ''}
                        {applied ? ' · On settlement' : ''}
                      </p>
                      {canEdit ? (
                        applied ? (
                          <p className="text-xs text-gray-600 mt-2">Remove it from the settlement first to edit or delete.</p>
                        ) : (
                          <div className="mt-2 flex gap-3">
                            <button type="button" className="text-xs text-gray-500 hover:text-blue-400 transition" onClick={() => startEditFuel(tx)}>
                              Edit
                            </button>
                            <button type="button" className="text-xs text-gray-500 hover:text-red-400 transition" onClick={() => setFuelToDelete(tx)}>
                              Delete
                            </button>
                          </div>
                        )
                      ) : null}
                    </div>
                    <p className="font-semibold text-red-400 shrink-0">{formatCurrency(tx.netAmount)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-color)] font-semibold">Toll Transactions</div>
          {loading ? (
            <div className="p-4 text-sm text-gray-500">Loading...</div>
          ) : tollTransactions.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No toll transactions yet.</div>
          ) : (
            <div className="divide-y divide-[var(--border-color)]">
              {tollTransactions.map((tx) => {
                const applied = isTollApplied(tx);
                return (
                  <div key={tx.id} className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-100">{tx.agency || tx.description || 'Toll'}</p>
                      <p className="text-xs text-gray-500">
                        Truck {tx.truck.unitNumber} · {formatDate(tx.date)}{tx.location ? ` · ${tx.location}` : ''}
                        {applied ? ' · On settlement' : ''}
                      </p>
                      {canEdit ? (
                        applied ? (
                          <p className="text-xs text-gray-600 mt-2">Remove it from the settlement first to edit or delete.</p>
                        ) : (
                          <div className="mt-2 flex gap-3">
                            <button type="button" className="text-xs text-gray-500 hover:text-blue-400 transition" onClick={() => startEditToll(tx)}>
                              Edit
                            </button>
                            <button type="button" className="text-xs text-gray-500 hover:text-red-400 transition" onClick={() => setTollToDelete(tx)}>
                              Delete
                            </button>
                          </div>
                        )
                      ) : null}
                    </div>
                    <p className="font-semibold text-red-400 shrink-0">{formatCurrency(tx.amount)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(fuelToDelete)}
        title="Delete fuel transaction?"
        message="This fuel entry will be permanently removed."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onCancel={() => !deleting && setFuelToDelete(null)}
        onConfirm={() => void handleDeleteFuel()}
      />
      <ConfirmDialog
        open={Boolean(tollToDelete)}
        title="Delete toll transaction?"
        message="This toll entry will be permanently removed."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onCancel={() => !deleting && setTollToDelete(null)}
        onConfirm={() => void handleDeleteToll()}
      />

      {toast ? <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
