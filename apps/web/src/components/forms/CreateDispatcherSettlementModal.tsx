'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { FormField, FormInput, FormSelect, FormTextarea } from '@/components/ui/FormElements';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';

interface CreateDispatcherSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (statementNumber?: string, settlementId?: string) => void;
}

interface Dispatcher {
  id: string;
  firstName: string;
  lastName: string;
  commissionRate: number;
}

interface EligibleLoad {
  id: string;
  loadNumber: string;
  brokerName: string;
  pickupDate: string;
  deliveryDate?: string | null;
  totalRevenueCents: number;
  commissionAmount: number;
}

export function CreateDispatcherSettlementModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateDispatcherSettlementModalProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [eligibleLoads, setEligibleLoads] = useState<EligibleLoad[]>([]);
  const [selectedDispatcher, setSelectedDispatcher] = useState('');
  const [weekStartDate, setWeekStartDate] = useState('');
  const [weekEndDate, setWeekEndDate] = useState('');
  const [selectedLoadIds, setSelectedLoadIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    api.get('/dispatchers?status=active&limit=200').then((r) => setDispatchers(r.data.data)).catch(() => {});
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    const toInputDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    setWeekStartDate(toInputDate(start));
    setWeekEndDate(toInputDate(end));
    setSelectedDispatcher('');
    setEligibleLoads([]);
    setSelectedLoadIds([]);
    setNotes('');
    setErrors({});
  }, [isOpen]);

  const fetchEligible = async () => {
    if (!selectedDispatcher || !weekStartDate || !weekEndDate) return;
    setFetching(true);
    try {
      const res = await api.get('/dispatcher-settlements/eligible', {
        params: { dispatcherId: selectedDispatcher, weekStartDate, weekEndDate },
      });
      const loads = (res.data.data.loads || []) as EligibleLoad[];
      setEligibleLoads(loads);
      setSelectedLoadIds(loads.map((l) => l.id));
    } catch {
      setEligibleLoads([]);
      setSelectedLoadIds([]);
      setErrors({ _form: 'Could not load eligible booked loads' });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (isOpen && selectedDispatcher && weekStartDate && weekEndDate) {
      void fetchEligible();
    }
  }, [isOpen, selectedDispatcher, weekStartDate, weekEndDate]);

  const totalCommission = eligibleLoads
    .filter((l) => selectedLoadIds.includes(l.id))
    .reduce((sum, l) => sum + l.commissionAmount, 0);

  const handleSubmit = async () => {
    if (!selectedDispatcher) {
      setErrors({ dispatcherId: 'Select a dispatcher' });
      return;
    }
    if (selectedLoadIds.length === 0) {
      setErrors({ _form: 'Select at least one booked load' });
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/dispatcher-settlements', {
        dispatcherId: selectedDispatcher,
        weekStartDate,
        weekEndDate,
        loadIds: selectedLoadIds,
        notes: notes || undefined,
      });
      const settlement = res.data.data.settlement;
      onSuccess(settlement.statementNumber, settlement.id);
      onClose();
    } catch {
      setErrors({ _form: 'Could not create dispatcher settlement' });
    } finally {
      setLoading(false);
    }
  };

  const selectedDispatcherRow = dispatchers.find((d) => d.id === selectedDispatcher);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Dispatcher Settlement" size="lg">
      <div className="space-y-4">
        {errors._form ? <p className="text-red-400 text-sm">{errors._form}</p> : null}
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Dispatcher" required error={errors.dispatcherId}>
            <FormSelect
              value={selectedDispatcher}
              onChange={(e) => setSelectedDispatcher(e.target.value)}
              placeholder="Select dispatcher"
              options={dispatchers.map((d) => ({
                value: d.id,
                label: `${d.firstName} ${d.lastName} (${(d.commissionRate / 100).toFixed(2)}%)`,
              }))}
            />
          </FormField>
          <FormField label="Week start">
            <FormInput type="date" value={weekStartDate} onChange={(e) => setWeekStartDate(e.target.value)} />
          </FormField>
          <FormField label="Week end">
            <FormInput type="date" value={weekEndDate} onChange={(e) => setWeekEndDate(e.target.value)} />
          </FormField>
        </div>

        {selectedDispatcherRow ? (
          <p className="text-sm text-gray-400">
            Commission rate: {(selectedDispatcherRow.commissionRate / 100).toFixed(2)}% of load gross
          </p>
        ) : null}

        {fetching ? (
          <p className="text-sm text-gray-400">Loading booked loads…</p>
        ) : eligibleLoads.length === 0 ? (
          <p className="text-sm text-gray-500">No unsettled booked loads in this period.</p>
        ) : (
          <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
            <table className="data-table text-sm">
              <thead>
                <tr>
                  <th />
                  <th>Load</th>
                  <th>Broker</th>
                  <th>Delivery</th>
                  <th>Gross</th>
                  <th>Commission</th>
                </tr>
              </thead>
              <tbody>
                {eligibleLoads.map((load) => (
                  <tr key={load.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedLoadIds.includes(load.id)}
                        onChange={(e) => {
                          setSelectedLoadIds((prev) =>
                            e.target.checked ? [...prev, load.id] : prev.filter((id) => id !== load.id),
                          );
                        }}
                      />
                    </td>
                    <td>{load.loadNumber}</td>
                    <td>{load.brokerName}</td>
                    <td>{load.deliveryDate ? formatDate(load.deliveryDate) : '—'}</td>
                    <td>{formatCurrency(load.totalRevenueCents / 100)}</td>
                    <td>{formatCurrency(load.commissionAmount / 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-gray-400">{selectedLoadIds.length} load(s) selected</span>
          <span className="font-semibold">Payout: {formatCurrency(totalCommission / 100)}</span>
        </div>

        <FormField label="Notes">
          <FormTextarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </FormField>
      </div>
      <ModalFooter>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" disabled={loading || fetching} onClick={() => void handleSubmit()}>
          {loading ? 'Creating…' : 'Create statement'}
        </button>
      </ModalFooter>
    </Modal>
  );
}
