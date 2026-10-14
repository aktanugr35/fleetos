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

type FuelKind = 'DIESEL' | 'DEF';

interface FuelTransaction {
  id: string;
  invoiceId?: string | null;
  date: string;
  fuelType?: FuelKind;
  merchant?: string | null;
  reference?: string | null;
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

interface FuelInvoice {
  key: string;
  date: string;
  merchant?: string | null;
  reference?: string | null;
  truck: { id: string; unitNumber: string };
  fuelCard: FuelTransaction['fuelCard'];
  lines: FuelTransaction[];
  netAmount: number;
  discount: number;
  applied: boolean;
}

interface FuelLineForm {
  enabled: boolean;
  gallons: string;
  retailPrice: string;
  totalPaid: string;
}

const FUEL_KINDS: { kind: FuelKind; field: 'diesel' | 'def'; label: string }[] = [
  { kind: 'DIESEL', field: 'diesel', label: 'Diesel' },
  { kind: 'DEF', field: 'def', label: 'DEF' },
];

const today = () => new Date().toISOString().split('T')[0];
const emptyFuelLine = (enabled: boolean): FuelLineForm => ({ enabled, gallons: '', retailPrice: '', totalPaid: '' });
const emptyFuelTx = () => ({
  fuelCardId: '',
  date: today(),
  merchant: '',
  reference: '',
  diesel: emptyFuelLine(true),
  def: emptyFuelLine(false),
});
const emptyTollTx = () => ({ tollDeviceId: '', date: today(), agency: '', location: '', description: '', amount: '' });

function dollarsToCents(value: string): number {
  return Math.round((parseFloat(value) || 0) * 100);
}

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function calcFuelLine(line: FuelLineForm) {
  const gallons = parseFloat(line.gallons) || 0;
  const price = parseFloat(line.retailPrice) || 0;
  const paidCents = dollarsToCents(line.totalPaid);
  const retailCents = Math.round(gallons * price * 100);
  const discountCents = retailCents - paidCents;
  let error: string | null = null;
  if (gallons <= 0 || price <= 0 || paidCents < 1) {
    error = 'Enter gallons, retail price per gallon, and the amount paid';
  } else if (discountCents < 0) {
    error = 'Amount paid is higher than the retail total — check the numbers';
  }
  return { gallons, retailCents, paidCents, discountCents, error };
}

function lineFormFrom(tx: FuelTransaction | undefined): FuelLineForm {
  if (!tx) return emptyFuelLine(false);
  return {
    enabled: true,
    gallons: tx.gallons != null ? String(tx.gallons) : '',
    retailPrice: tx.gallons ? (tx.grossAmount / 100 / tx.gallons).toFixed(3) : '',
    totalPaid: centsToDollars(tx.netAmount),
  };
}

function groupFuelInvoices(transactions: FuelTransaction[]): FuelInvoice[] {
  const groups = new Map<string, FuelInvoice>();
  for (const tx of transactions) {
    const key = tx.invoiceId || tx.id;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        date: tx.date,
        merchant: tx.merchant,
        reference: tx.reference,
        truck: tx.truck,
        fuelCard: tx.fuelCard,
        lines: [],
        netAmount: 0,
        discount: 0,
        applied: false,
      };
      groups.set(key, group);
    }
    group.lines.push(tx);
    group.netAmount += tx.netAmount;
    group.discount += tx.discount;
    group.applied ||= (tx.settlementFuelTransactions?.length ?? 0) > 0;
  }
  for (const group of groups.values()) {
    group.lines.sort((a, b) => (a.fuelType === 'DEF' ? 1 : 0) - (b.fuelType === 'DEF' ? 1 : 0));
  }
  return [...groups.values()];
}

function isTollApplied(tx: TollTransaction): boolean {
  return (tx.settlementTollTransactions?.length ?? 0) > 0;
}

type FuelStatusFilter = 'all' | 'open' | 'settled';

const FUEL_PAGE_SIZE = 15;

function FuelLineCell({ tx }: { tx?: FuelTransaction }) {
  if (!tx) return <span className="text-gray-600">—</span>;
  return (
    <>
      <div className="text-gray-200">{formatCurrency(tx.netAmount)}</div>
      {tx.gallons ? <div className="text-xs text-gray-500">{tx.gallons} gal</div> : null}
    </>
  );
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
  const [editingFuelKey, setEditingFuelKey] = useState<string | null>(null);
  const [editingTollId, setEditingTollId] = useState<string | null>(null);
  const [fuelToDelete, setFuelToDelete] = useState<FuelInvoice | null>(null);
  const [tollToDelete, setTollToDelete] = useState<TollTransaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [fuelFilter, setFuelFilterState] = useState({ search: '', truckId: '', status: 'all' as FuelStatusFilter, from: '', to: '' });
  const [fuelPage, setFuelPage] = useState(1);
  const setFuelFilter: typeof setFuelFilterState = (update) => {
    setFuelFilterState(update);
    setFuelPage(1);
  };

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
    const lines = FUEL_KINDS.filter(({ field }) => fuelTxForm[field].enabled).map(({ kind, field, label }) => ({
      kind,
      label,
      ...calcFuelLine(fuelTxForm[field]),
    }));
    const lineError = lines.find((line) => line.error);
    const error = lines.length === 0
      ? 'Select Diesel, DEF, or both'
      : lineError
        ? `${lineError.label}: ${lineError.error}`
        : null;
    return {
      lines,
      error,
      retailCents: lines.reduce((sum, line) => sum + line.retailCents, 0),
      paidCents: lines.reduce((sum, line) => sum + line.paidCents, 0),
      discountCents: lines.reduce((sum, line) => sum + line.discountCents, 0),
    };
  }, [fuelTxForm]);

  const fuelInvoices = useMemo(() => groupFuelInvoices(fuelTransactions), [fuelTransactions]);

  const fuelTruckOptions = useMemo(() => {
    const byId = new Map(fuelInvoices.map((invoice) => [invoice.truck.id, invoice.truck.unitNumber]));
    return [...byId.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], undefined, { numeric: true }))
      .map(([value, unitNumber]) => ({ value, label: `Truck ${unitNumber}` }));
  }, [fuelInvoices]);

  const filteredFuelInvoices = useMemo(() => {
    const search = fuelFilter.search.trim().toLowerCase();
    return fuelInvoices.filter((invoice) => {
      if (fuelFilter.truckId && invoice.truck.id !== fuelFilter.truckId) return false;
      if (fuelFilter.status === 'open' && invoice.applied) return false;
      if (fuelFilter.status === 'settled' && !invoice.applied) return false;
      const day = toDateInputValue(invoice.date);
      if (fuelFilter.from && day < fuelFilter.from) return false;
      if (fuelFilter.to && day > fuelFilter.to) return false;
      if (search) {
        const haystack = [invoice.merchant, invoice.reference, invoice.fuelCard.displayName, invoice.truck.unitNumber]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [fuelInvoices, fuelFilter]);

  const filteredFuelTotal = filteredFuelInvoices.reduce((sum, invoice) => sum + invoice.netAmount, 0);
  const fuelPageCount = Math.max(1, Math.ceil(filteredFuelInvoices.length / FUEL_PAGE_SIZE));
  const currentFuelPage = Math.min(fuelPage, fuelPageCount);
  const pagedFuelInvoices = filteredFuelInvoices.slice(
    (currentFuelPage - 1) * FUEL_PAGE_SIZE,
    currentFuelPage * FUEL_PAGE_SIZE,
  );

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

  const startEditFuel = (invoice: FuelInvoice) => {
    if (invoice.applied) return;
    setEditingFuelKey(invoice.key);
    setFuelTxForm({
      fuelCardId: invoice.fuelCard.id,
      date: toDateInputValue(invoice.date),
      merchant: invoice.merchant || '',
      reference: invoice.reference || '',
      diesel: lineFormFrom(invoice.lines.find((tx) => tx.fuelType !== 'DEF')),
      def: lineFormFrom(invoice.lines.find((tx) => tx.fuelType === 'DEF')),
    });
    document.getElementById('fuel-invoice-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cancelEditFuel = () => {
    setEditingFuelKey(null);
    setFuelTxForm(emptyFuelTx());
  };

  const setFuelLine = (field: 'diesel' | 'def', patch: Partial<FuelLineForm>) => {
    setFuelTxForm((prev) => ({ ...prev, [field]: { ...prev[field], ...patch } }));
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
    if (!fuelTxForm.fuelCardId || fuelCalc.error) return;
    setSaving('fuel-tx');
    const payload = {
      fuelCardId: fuelTxForm.fuelCardId,
      date: fuelTxForm.date,
      merchant: fuelTxForm.merchant,
      reference: fuelTxForm.reference,
      lines: fuelCalc.lines.map((line) => ({
        fuelType: line.kind,
        gallons: line.gallons,
        grossAmount: line.retailCents,
        discount: line.discountCents,
      })),
    };
    try {
      if (editingFuelKey) {
        await api.put(`/fuel-invoices/${editingFuelKey}`, payload);
        setToast({ type: 'success', message: 'Fuel invoice updated' });
      } else {
        await api.post('/fuel-invoices', payload);
        setToast({ type: 'success', message: 'Fuel invoice added' });
      }
      cancelEditFuel();
      await load();
    } catch (err) {
      setToast({
        type: 'error',
        message: getApiErrorMessage(err, editingFuelKey ? 'Could not update fuel invoice' : 'Could not add fuel invoice'),
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
      await api.delete(`/fuel-invoices/${fuelToDelete.key}`);
      if (editingFuelKey === fuelToDelete.key) cancelEditFuel();
      setToast({ type: 'success', message: 'Fuel invoice deleted' });
      setFuelToDelete(null);
      await load();
    } catch (err) {
      setToast({ type: 'error', message: getApiErrorMessage(err, 'Could not delete fuel invoice') });
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
          <section id="fuel-invoice-form" className="card scroll-mt-4">
            <h2 className="font-semibold text-gray-100 mb-4">
              {editingFuelKey ? 'Edit Fuel Invoice' : 'Add Fuel Invoice'}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Fuel card" required className="sm:col-span-2">
                <FormSelect value={fuelTxForm.fuelCardId} placeholder="Select fuel card" options={fuelCardOptions} onChange={(e) => setFuelTxForm((p) => ({ ...p, fuelCardId: e.target.value }))} />
              </FormField>
              <FormField label="Date" required>
                <FormInput type="date" value={fuelTxForm.date} onChange={(e) => setFuelTxForm((p) => ({ ...p, date: e.target.value }))} />
              </FormField>
              <FormField label="Invoice #">
                <FormInput value={fuelTxForm.reference} onChange={(e) => setFuelTxForm((p) => ({ ...p, reference: e.target.value }))} placeholder="Invoice number" />
              </FormField>
              <FormField label="Merchant" className="sm:col-span-2">
                <FormInput value={fuelTxForm.merchant} onChange={(e) => setFuelTxForm((p) => ({ ...p, merchant: e.target.value }))} placeholder="Merchant" />
              </FormField>
            </div>

            <div className="mt-4 space-y-3">
              {FUEL_KINDS.map(({ field, label }) => {
                const line = fuelTxForm[field];
                return (
                  <div key={field} className="rounded-lg border border-[var(--border-color)] p-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={line.enabled}
                        onChange={(e) => setFuelLine(field, { enabled: e.target.checked })}
                      />
                      {label}
                    </label>
                    {line.enabled ? (
                      <div className="grid grid-cols-1 gap-3 mt-3 sm:grid-cols-3">
                        <FormField label="Gallons" required>
                          <FormInput type="number" step="0.001" min="0" value={line.gallons} onChange={(e) => setFuelLine(field, { gallons: e.target.value })} placeholder={field === 'def' ? 'e.g. 5' : 'e.g. 120.5'} />
                        </FormField>
                        <FormField label="Retail $/gal" required>
                          <FormInput type="number" step="0.001" min="0" value={line.retailPrice} onChange={(e) => setFuelLine(field, { retailPrice: e.target.value })} placeholder={field === 'def' ? 'e.g. 4.199' : 'e.g. 3.899'} />
                        </FormField>
                        <FormField label="Paid ($)" required>
                          <FormInput type="number" step="0.01" min="0" value={line.totalPaid} onChange={(e) => setFuelLine(field, { totalPaid: e.target.value })} placeholder={field === 'def' ? 'e.g. 20.00' : 'e.g. 410.25'} />
                        </FormField>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-lg border border-[var(--border-color)] p-3 text-sm space-y-1">
              {fuelCalc.lines.map((line) => (
                <div key={line.kind} className="flex justify-between text-gray-400">
                  <span>{line.label} · retail {formatCurrency(line.retailCents)} · paid {formatCurrency(line.paidCents)}</span>
                  <span className={line.discountCents < 0 ? 'text-red-400' : 'text-green-400'}>
                    {formatCurrency(line.discountCents)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-gray-300 pt-1 border-t border-[var(--border-color)]">
                <span>Invoice total paid</span>
                <span>{formatCurrency(fuelCalc.paidCents)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-gray-200">Total discount</span>
                <span className={fuelCalc.discountCents < 0 ? 'text-red-400' : 'text-green-400'}>
                  {formatCurrency(fuelCalc.discountCents)}
                </span>
              </div>
              {fuelCalc.error && FUEL_KINDS.some(({ field }) => {
                const line = fuelTxForm[field];
                return line.gallons || line.retailPrice || line.totalPaid;
              }) ? (
                <p className="text-xs text-red-400 pt-1">{fuelCalc.error}</p>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary w-full sm:w-auto" disabled={saving === 'fuel-tx' || !fuelTxForm.fuelCardId || Boolean(fuelCalc.error)} onClick={() => void submitFuelTransaction()}>
                {editingFuelKey ? 'Save Invoice Changes' : 'Add Fuel Invoice'}
              </button>
              {editingFuelKey ? (
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

      <section className="card p-0 overflow-hidden mt-6">
        <div className="px-4 py-3 border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-gray-100">Fuel History</h2>
          <span className="text-xs text-gray-500">
            {filteredFuelInvoices.length} invoice{filteredFuelInvoices.length === 1 ? '' : 's'} · {formatCurrency(filteredFuelTotal)}
          </span>
        </div>
        <div className="px-4 py-3 border-b border-[var(--border-color)] grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <FormInput
            value={fuelFilter.search}
            onChange={(e) => setFuelFilter((p) => ({ ...p, search: e.target.value }))}
            placeholder="Search merchant or invoice #"
            className="lg:col-span-2"
          />
          <FormSelect
            value={fuelFilter.truckId}
            onChange={(e) => setFuelFilter((p) => ({ ...p, truckId: e.target.value }))}
            options={[{ value: '', label: 'All trucks' }, ...fuelTruckOptions]}
          />
          <FormSelect
            value={fuelFilter.status}
            onChange={(e) => setFuelFilter((p) => ({ ...p, status: e.target.value as FuelStatusFilter }))}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'open', label: 'Not on a statement' },
              { value: 'settled', label: 'On a statement' },
            ]}
          />
          <div className="flex items-center gap-2">
            <FormInput type="date" value={fuelFilter.from} onChange={(e) => setFuelFilter((p) => ({ ...p, from: e.target.value }))} aria-label="From date" />
            <FormInput type="date" value={fuelFilter.to} onChange={(e) => setFuelFilter((p) => ({ ...p, to: e.target.value }))} aria-label="To date" />
          </div>
        </div>
        {loading ? (
          <div className="p-4 text-sm text-gray-500">Loading...</div>
        ) : fuelInvoices.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No fuel invoices yet.</div>
        ) : filteredFuelInvoices.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No invoices match these filters.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-[var(--border-color)]">
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Truck</th>
                    <th className="px-4 py-2 font-medium">Merchant / Invoice</th>
                    <th className="px-4 py-2 font-medium text-right">Diesel</th>
                    <th className="px-4 py-2 font-medium text-right">DEF</th>
                    <th className="px-4 py-2 font-medium text-right">Saved</th>
                    <th className="px-4 py-2 font-medium text-right">Paid</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    {canEdit ? <th className="px-4 py-2" /> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {pagedFuelInvoices.map((invoice) => {
                    const diesel = invoice.lines.find((tx) => tx.fuelType !== 'DEF');
                    const def = invoice.lines.find((tx) => tx.fuelType === 'DEF');
                    return (
                      <tr key={invoice.key} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 whitespace-nowrap text-gray-300">{formatDate(invoice.date)}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-gray-300">{invoice.truck.unitNumber}</td>
                        <td className="px-4 py-2.5 min-w-[10rem]">
                          <div className="text-gray-100">{invoice.merchant || invoice.fuelCard.displayName || 'Fuel'}</div>
                          {invoice.reference ? <div className="text-xs text-gray-500">#{invoice.reference}</div> : null}
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap"><FuelLineCell tx={diesel} /></td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap"><FuelLineCell tx={def} /></td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap text-green-400">
                          {invoice.discount > 0 ? formatCurrency(invoice.discount) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap font-semibold text-red-400">{formatCurrency(invoice.netAmount)}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {invoice.applied ? (
                            <span className="px-2 py-0.5 text-[11px] rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">On statement</span>
                          ) : (
                            <span className="px-2 py-0.5 text-[11px] rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/30">Open</span>
                          )}
                        </td>
                        {canEdit ? (
                          <td className="px-4 py-2.5 whitespace-nowrap text-right">
                            {invoice.applied ? (
                              <span className="text-xs text-gray-600" title="Remove it from the statement first to edit or delete">Locked</span>
                            ) : (
                              <div className="flex justify-end gap-3">
                                <button type="button" className="text-xs text-gray-400 hover:text-blue-400 transition" onClick={() => startEditFuel(invoice)}>
                                  Edit
                                </button>
                                <button type="button" className="text-xs text-gray-400 hover:text-red-400 transition" onClick={() => setFuelToDelete(invoice)}>
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {fuelPageCount > 1 ? (
              <div className="px-4 py-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-gray-500">
                <span>Page {currentFuelPage} of {fuelPageCount}</span>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-secondary px-3 py-1 text-xs" disabled={currentFuelPage <= 1} onClick={() => setFuelPage(currentFuelPage - 1)}>
                    Previous
                  </button>
                  <button type="button" className="btn btn-secondary px-3 py-1 text-xs" disabled={currentFuelPage >= fuelPageCount} onClick={() => setFuelPage(currentFuelPage + 1)}>
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>

      <div className="mt-6">
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
        title="Delete fuel invoice?"
        message="This invoice and its Diesel/DEF lines will be permanently removed."
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
