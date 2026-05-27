'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { FormField, FormInput, FormSelect } from '@/components/ui/FormElements';
import { Toast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
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
  merchant?: string | null;
  gallons?: number | null;
  grossAmount: number;
  discount: number;
  netAmount: number;
  truck: { id: string; unitNumber: string };
  fuelCard: { id: string; cardNumber: string; displayName?: string | null; provider?: string | null };
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
}

const today = () => new Date().toISOString().split('T')[0];

function dollarsToCents(value: string): number {
  return Math.round((parseFloat(value) || 0) * 100);
}

export default function FuelTollPage() {
  const [trucks, setTrucks] = useState<TruckOption[]>([]);
  const [fuelCards, setFuelCards] = useState<FuelCard[]>([]);
  const [tollDevices, setTollDevices] = useState<TollDevice[]>([]);
  const [fuelTransactions, setFuelTransactions] = useState<FuelTransaction[]>([]);
  const [tollTransactions, setTollTransactions] = useState<TollTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [fuelCardForm, setFuelCardForm] = useState({ truckId: '', provider: '', cardNumber: '', displayName: '' });
  const [tollDeviceForm, setTollDeviceForm] = useState({ truckId: '', provider: '', deviceNumber: '', displayName: '' });
  const [fuelTxForm, setFuelTxForm] = useState({ fuelCardId: '', date: today(), merchant: '', gallons: '', grossAmount: '', discount: '' });
  const [tollTxForm, setTollTxForm] = useState({ tollDeviceId: '', date: today(), agency: '', location: '', description: '', amount: '' });

  const truckOptions = trucks.map((t) => ({ value: t.id, label: `${t.unitNumber} — ${t.make} ${t.model}` }));
  const fuelCardOptions = fuelCards.filter((c) => c.isActive).map((c) => ({
    value: c.id,
    label: `${c.displayName || c.provider || 'Fuel Card'} · ${c.cardNumber} · Truck ${c.truck.unitNumber}`,
  }));
  const tollDeviceOptions = tollDevices.filter((d) => d.isActive).map((d) => ({
    value: d.id,
    label: `${d.displayName || d.provider || 'Toll Device'} · ${d.deviceNumber} · Truck ${d.truck.unitNumber}`,
  }));

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

  const submitFuelCard = async () => {
    if (!fuelCardForm.truckId || !fuelCardForm.cardNumber.trim()) return;
    setSaving('fuel-card');
    try {
      await api.post('/fuel-cards', fuelCardForm);
      setFuelCardForm({ truckId: '', provider: '', cardNumber: '', displayName: '' });
      setToast({ type: 'success', message: 'Fuel card added' });
      await load();
    } catch {
      setToast({ type: 'error', message: 'Could not add fuel card' });
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
    } catch {
      setToast({ type: 'error', message: 'Could not add toll device' });
    } finally {
      setSaving(null);
    }
  };

  const submitFuelTransaction = async () => {
    const grossAmount = dollarsToCents(fuelTxForm.grossAmount);
    const discount = dollarsToCents(fuelTxForm.discount);
    if (!fuelTxForm.fuelCardId || grossAmount < 1 || grossAmount - discount < 1) return;
    setSaving('fuel-tx');
    try {
      await api.post('/fuel-transactions', {
        fuelCardId: fuelTxForm.fuelCardId,
        date: fuelTxForm.date,
        merchant: fuelTxForm.merchant,
        gallons: fuelTxForm.gallons ? parseFloat(fuelTxForm.gallons) : undefined,
        grossAmount,
        discount,
      });
      setFuelTxForm({ fuelCardId: '', date: today(), merchant: '', gallons: '', grossAmount: '', discount: '' });
      setToast({ type: 'success', message: 'Fuel transaction added' });
      await load();
    } catch {
      setToast({ type: 'error', message: 'Could not add fuel transaction' });
    } finally {
      setSaving(null);
    }
  };

  const submitTollTransaction = async () => {
    const amount = dollarsToCents(tollTxForm.amount);
    if (!tollTxForm.tollDeviceId || amount < 1) return;
    setSaving('toll-tx');
    try {
      await api.post('/toll-transactions', {
        tollDeviceId: tollTxForm.tollDeviceId,
        date: tollTxForm.date,
        agency: tollTxForm.agency,
        location: tollTxForm.location,
        description: tollTxForm.description,
        amount,
      });
      setTollTxForm({ tollDeviceId: '', date: today(), agency: '', location: '', description: '', amount: '' });
      setToast({ type: 'success', message: 'Toll transaction added' });
      await load();
    } catch {
      setToast({ type: 'error', message: 'Could not add toll transaction' });
    } finally {
      setSaving(null);
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
        <section className="card">
          <h2 className="font-semibold text-gray-100 mb-4">Assign Fuel Card</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Truck" required>
              <FormSelect value={fuelCardForm.truckId} placeholder="Select truck" options={truckOptions} onChange={(e) => setFuelCardForm((p) => ({ ...p, truckId: e.target.value }))} />
            </FormField>
            <FormField label="Card number / last 4" required>
              <FormInput value={fuelCardForm.cardNumber} onChange={(e) => setFuelCardForm((p) => ({ ...p, cardNumber: e.target.value }))} placeholder="1234" />
            </FormField>
            <FormField label="Provider">
              <FormInput value={fuelCardForm.provider} onChange={(e) => setFuelCardForm((p) => ({ ...p, provider: e.target.value }))} placeholder="WEX, EFS..." />
            </FormField>
            <FormField label="Display name">
              <FormInput value={fuelCardForm.displayName} onChange={(e) => setFuelCardForm((p) => ({ ...p, displayName: e.target.value }))} placeholder="Truck 12 Fuel" />
            </FormField>
          </div>
          <button type="button" className="btn btn-primary w-full mt-4 sm:w-auto" disabled={saving === 'fuel-card'} onClick={() => void submitFuelCard()}>
            Add Fuel Card
          </button>
        </section>

        <section className="card">
          <h2 className="font-semibold text-gray-100 mb-4">Assign Toll Device</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Truck" required>
              <FormSelect value={tollDeviceForm.truckId} placeholder="Select truck" options={truckOptions} onChange={(e) => setTollDeviceForm((p) => ({ ...p, truckId: e.target.value }))} />
            </FormField>
            <FormField label="Device / tag number" required>
              <FormInput value={tollDeviceForm.deviceNumber} onChange={(e) => setTollDeviceForm((p) => ({ ...p, deviceNumber: e.target.value }))} placeholder="EZPASS-123" />
            </FormField>
            <FormField label="Provider">
              <FormInput value={tollDeviceForm.provider} onChange={(e) => setTollDeviceForm((p) => ({ ...p, provider: e.target.value }))} placeholder="EZPass, Bestpass..." />
            </FormField>
            <FormField label="Display name">
              <FormInput value={tollDeviceForm.displayName} onChange={(e) => setTollDeviceForm((p) => ({ ...p, displayName: e.target.value }))} placeholder="Truck 12 Toll" />
            </FormField>
          </div>
          <button type="button" className="btn btn-primary w-full mt-4 sm:w-auto" disabled={saving === 'toll-device'} onClick={() => void submitTollDevice()}>
            Add Toll Device
          </button>
        </section>

        <section className="card">
          <h2 className="font-semibold text-gray-100 mb-4">Add Fuel Transaction</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Fuel card" required className="sm:col-span-2">
              <FormSelect value={fuelTxForm.fuelCardId} placeholder="Select fuel card" options={fuelCardOptions} onChange={(e) => setFuelTxForm((p) => ({ ...p, fuelCardId: e.target.value }))} />
            </FormField>
            <FormField label="Date" required>
              <FormInput type="date" value={fuelTxForm.date} onChange={(e) => setFuelTxForm((p) => ({ ...p, date: e.target.value }))} />
            </FormField>
            <FormField label="Merchant">
              <FormInput value={fuelTxForm.merchant} onChange={(e) => setFuelTxForm((p) => ({ ...p, merchant: e.target.value }))} placeholder="Pilot, Love's..." />
            </FormField>
            <FormField label="Gross amount ($)" required>
              <FormInput type="number" step="0.01" value={fuelTxForm.grossAmount} onChange={(e) => setFuelTxForm((p) => ({ ...p, grossAmount: e.target.value }))} />
            </FormField>
            <FormField label="Discount ($)">
              <FormInput type="number" step="0.01" value={fuelTxForm.discount} onChange={(e) => setFuelTxForm((p) => ({ ...p, discount: e.target.value }))} />
            </FormField>
            <FormField label="Gallons">
              <FormInput type="number" step="0.001" value={fuelTxForm.gallons} onChange={(e) => setFuelTxForm((p) => ({ ...p, gallons: e.target.value }))} />
            </FormField>
          </div>
          <button type="button" className="btn btn-primary w-full mt-4 sm:w-auto" disabled={saving === 'fuel-tx'} onClick={() => void submitFuelTransaction()}>
            Add Fuel Transaction
          </button>
        </section>

        <section className="card">
          <h2 className="font-semibold text-gray-100 mb-4">Add Toll Transaction</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Toll device" required className="sm:col-span-2">
              <FormSelect value={tollTxForm.tollDeviceId} placeholder="Select toll device" options={tollDeviceOptions} onChange={(e) => setTollTxForm((p) => ({ ...p, tollDeviceId: e.target.value }))} />
            </FormField>
            <FormField label="Date" required>
              <FormInput type="date" value={tollTxForm.date} onChange={(e) => setTollTxForm((p) => ({ ...p, date: e.target.value }))} />
            </FormField>
            <FormField label="Agency">
              <FormInput value={tollTxForm.agency} onChange={(e) => setTollTxForm((p) => ({ ...p, agency: e.target.value }))} placeholder="EZPass" />
            </FormField>
            <FormField label="Location">
              <FormInput value={tollTxForm.location} onChange={(e) => setTollTxForm((p) => ({ ...p, location: e.target.value }))} />
            </FormField>
            <FormField label="Amount ($)" required>
              <FormInput type="number" step="0.01" value={tollTxForm.amount} onChange={(e) => setTollTxForm((p) => ({ ...p, amount: e.target.value }))} />
            </FormField>
            <FormField label="Description" className="sm:col-span-2">
              <FormInput value={tollTxForm.description} onChange={(e) => setTollTxForm((p) => ({ ...p, description: e.target.value }))} placeholder="Toll charge" />
            </FormField>
          </div>
          <button type="button" className="btn btn-primary w-full mt-4 sm:w-auto" disabled={saving === 'toll-tx'} onClick={() => void submitTollTransaction()}>
            Add Toll Transaction
          </button>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 mt-6 xl:grid-cols-2">
        <section className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-color)] font-semibold">Recent Fuel Transactions</div>
          {loading ? (
            <div className="p-4 text-sm text-gray-500">Loading...</div>
          ) : fuelTransactions.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No fuel transactions yet.</div>
          ) : (
            <div className="divide-y divide-[var(--border-color)]">
              {fuelTransactions.slice(0, 12).map((tx) => (
                <div key={tx.id} className="p-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-100">{tx.merchant || tx.fuelCard.displayName || 'Fuel'}</p>
                    <p className="text-xs text-gray-500">Truck {tx.truck.unitNumber} · {formatDate(tx.date)}{tx.gallons ? ` · ${tx.gallons} gal` : ''}</p>
                  </div>
                  <p className="font-semibold text-red-400">{formatCurrency(tx.netAmount)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-color)] font-semibold">Recent Toll Transactions</div>
          {loading ? (
            <div className="p-4 text-sm text-gray-500">Loading...</div>
          ) : tollTransactions.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No toll transactions yet.</div>
          ) : (
            <div className="divide-y divide-[var(--border-color)]">
              {tollTransactions.slice(0, 12).map((tx) => (
                <div key={tx.id} className="p-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-100">{tx.agency || tx.description || 'Toll'}</p>
                    <p className="text-xs text-gray-500">Truck {tx.truck.unitNumber} · {formatDate(tx.date)}{tx.location ? ` · ${tx.location}` : ''}</p>
                  </div>
                  <p className="font-semibold text-red-400">{formatCurrency(tx.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {toast ? <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
