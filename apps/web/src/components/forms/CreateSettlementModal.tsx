'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { FormField, FormInput, FormSelect, FormTextarea } from '@/components/ui/FormElements';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/deductions';
import api from '@/lib/api';
import { downloadSettlementPdf } from '@/lib/settlements';

interface CreateSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (statementNumber?: string, settlementId?: string) => void;
}

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  payStructure: string;
  payRate: number;
  driverType: string;
}

interface Load {
  id: string;
  loadNumber: string;
  pickupDate: string;
  deliveryDate: string;
  miles: number;
  totalRevenueCents: number;
  calculatedGrossCents: number;
  companyCommissionCents: number;
  role: string; // DRIVER | OWNER | OWNER_DRIVER
  truckId: string;
}

interface Deduction {
  id: string;
  type: string;
  description: string;
  amount: number;
  date: string;
}

interface Credit {
  id: string;
  type: string;
  description: string;
  amount: number;
  date: string;
}

interface FuelTransaction {
  id: string;
  truckId: string;
  date: string;
  merchant?: string | null;
  netAmount: number;
  fuelCard?: { displayName?: string | null; cardNumber?: string | null };
  truck?: { unitNumber: string };
}

interface TollTransaction {
  id: string;
  truckId: string;
  date: string;
  agency?: string | null;
  location?: string | null;
  description?: string | null;
  amount: number;
  tollDevice?: { displayName?: string | null; deviceNumber?: string | null };
  truck?: { unitNumber: string };
}

export function CreateSettlementModal({ isOpen, onClose, onSuccess }: CreateSettlementModalProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [eligibleLoads, setEligibleLoads] = useState<Load[]>([]);
  const [eligibleDeductions, setEligibleDeductions] = useState<Deduction[]>([]);
  const [eligibleCredits, setEligibleCredits] = useState<Credit[]>([]);
  const [eligibleFuelTransactions, setEligibleFuelTransactions] = useState<FuelTransaction[]>([]);
  const [eligibleTollTransactions, setEligibleTollTransactions] = useState<TollTransaction[]>([]);
  const [companyFeeCents, setCompanyFeeCents] = useState(0);
  const [eligibleSummary, setEligibleSummary] = useState<{
    loadsInPeriod?: number;
    deductionsInPeriod?: number;
    creditsInPeriod?: number;
    fuelTransactionsInPeriod?: number;
    tollTransactionsInPeriod?: number;
  } | null>(null);
  
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [weekStartDate, setWeekStartDate] = useState<string>('');
  const [weekEndDate, setWeekEndDate] = useState<string>('');
  const [selectedLoadIds, setSelectedLoadIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      api.get('/drivers').then(r => setDrivers(r.data.data)).catch(() => {});
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
    } else {
      setSelectedDriver('');
      setEligibleLoads([]);
      setEligibleDeductions([]);
      setEligibleCredits([]);
      setEligibleFuelTransactions([]);
      setEligibleTollTransactions([]);
      setCompanyFeeCents(0);
      setEligibleSummary(null);
      setSelectedLoadIds([]);
      setNotes('');
    }
  }, [isOpen]);

  const fetchEligible = async () => {
    if (!selectedDriver || !weekStartDate || !weekEndDate) {
      setEligibleLoads([]);
      setEligibleDeductions([]);
      setEligibleCredits([]);
      setEligibleFuelTransactions([]);
      setEligibleTollTransactions([]);
      setCompanyFeeCents(0);
      setEligibleSummary(null);
      setSelectedLoadIds([]);
      return;
    }

    if (weekEndDate < weekStartDate) {
      setEligibleLoads([]);
      setEligibleDeductions([]);
      setEligibleCredits([]);
      setEligibleFuelTransactions([]);
      setEligibleTollTransactions([]);
      setCompanyFeeCents(0);
      setEligibleSummary(null);
      setSelectedLoadIds([]);
      return;
    }

    setFetching(true);
    try {
      const params = new URLSearchParams({
        driverId: selectedDriver,
        weekStartDate,
        weekEndDate,
      });
      const res = await api.get(`/settlements/eligible?${params}`);
      const loads: Load[] = res.data.data.loads;
      setEligibleLoads(loads);
      setEligibleDeductions(res.data.data.deductions);
      setEligibleCredits(res.data.data.credits || []);
      setEligibleFuelTransactions(res.data.data.fuelTransactions || []);
      setEligibleTollTransactions(res.data.data.tollTransactions || []);
      setCompanyFeeCents(res.data.data.companyFeeCents ?? 0);
      setEligibleSummary(res.data.data.summary || null);
      setSelectedLoadIds(loads.map((l) => l.id));
      setErrors((prev) => ({ ...prev, _eligible: '' }));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Could not load eligible items for this period';
      setEligibleLoads([]);
      setEligibleDeductions([]);
      setEligibleCredits([]);
      setEligibleFuelTransactions([]);
      setEligibleTollTransactions([]);
      setCompanyFeeCents(0);
      setEligibleSummary(null);
      setSelectedLoadIds([]);
      setErrors((prev) => ({ ...prev, _eligible: message }));
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    void fetchEligible();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDriver, weekStartDate, weekEndDate]);

  const driver = drivers.find(d => d.id === selectedDriver);
  const selectedLoadsObj = eligibleLoads.filter(l => selectedLoadIds.includes(l.id));
  const selectedTruckIds = new Set(selectedLoadsObj.map((l) => l.truckId));
  const selectedFuelTransactions = eligibleFuelTransactions.filter((t) => selectedTruckIds.has(t.truckId));
  const selectedTollTransactions = eligibleTollTransactions.filter((t) => selectedTruckIds.has(t.truckId));
  
  // Use backend-calculated values
  const grossPayCents = selectedLoadsObj.reduce((sum, l) => sum + l.calculatedGrossCents, 0);
  const totalCommission = selectedLoadsObj.reduce((sum, l) => sum + (l.companyCommissionCents || 0), 0);
  const totalRevenue = selectedLoadsObj.reduce((sum, l) => sum + l.totalRevenueCents, 0);
  const totalDeductionsCents =
    eligibleDeductions.reduce((sum, d) => sum + d.amount, 0) +
    selectedFuelTransactions.reduce((sum, t) => sum + t.netAmount, 0) +
    selectedTollTransactions.reduce((sum, t) => sum + t.amount, 0) +
    companyFeeCents;
  const totalCreditsCents = eligibleCredits.reduce((sum, c) => sum + c.amount, 0);
  const netPayCents = grossPayCents - totalDeductionsCents + totalCreditsCents;

  const toggleLoad = (id: string) => {
    setSelectedLoadIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!selectedDriver) e.driverId = 'Required';
    if (!weekStartDate) e.weekStartDate = 'Required';
    if (!weekEndDate) e.weekEndDate = 'Required';
    if (weekStartDate && weekEndDate && weekEndDate < weekStartDate) {
      e.weekEndDate = 'End date must be on or after start date';
    }
    const hasItems =
      selectedLoadIds.length > 0 ||
      eligibleDeductions.length > 0 ||
      eligibleCredits.length > 0 ||
      selectedFuelTransactions.length > 0 ||
      selectedTollTransactions.length > 0 ||
      companyFeeCents > 0;
    if (!hasItems) {
      e.loads = 'Select at least one load, or ensure deductions/credits exist in this period';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.post('/settlements', {
        driverId: selectedDriver,
        weekStartDate,
        weekEndDate,
        loadIds: selectedLoadIds,
        notes: notes || undefined,
      });
      const payload = res.data.data as {
        settlement: { id: string; statementNumber: string | null };
        pdfGenerated: boolean;
      };
      const settlement = payload.settlement;
      const statementNumber = settlement.statementNumber || undefined;

      if (payload.pdfGenerated) {
        await downloadSettlementPdf(settlement.id, statementNumber || settlement.id);
      } else {
        try {
          await api.post(`/settlements/${settlement.id}/pdf`);
          await downloadSettlementPdf(settlement.id, statementNumber || settlement.id);
        } catch {
          setErrors({
            _form:
              'Settlement saved as DRAFT but PDF generation failed. Open it from the list and use Generate PDF.',
          });
          onSuccess(statementNumber, settlement.id);
          onClose();
          return;
        }
      }

      onSuccess(statementNumber, settlement.id);
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Failed to create settlement';
      setErrors({ _form: message });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'OWNER_DRIVER') return <span className="px-1.5 py-0.5 text-[10px] bg-purple-500/15 text-purple-400 border border-purple-500/30 rounded-full">Owner+Driver</span>;
    if (role === 'OWNER') return <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full">Owner</span>;
    return <span className="px-1.5 py-0.5 text-[10px] bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded-full">Driver</span>;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Settlement" description="Select driver and loads to settle" size="xl">
      {errors._form && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">{errors._form}</div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <FormField label="Driver" required error={errors.driverId}>
          <FormSelect value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)} error={!!errors.driverId}
            placeholder="Select driver" options={drivers.map(d => ({ value: d.id, label: `${d.firstName} ${d.lastName}` }))} />
        </FormField>
        <FormField label="Period Start" required error={errors.weekStartDate}>
          <FormInput
            type="date"
            value={weekStartDate}
            onChange={(e) => setWeekStartDate(e.target.value)}
            error={!!errors.weekStartDate}
          />
        </FormField>
        <FormField label="Period End" required error={errors.weekEndDate}>
          <FormInput
            type="date"
            value={weekEndDate}
            min={weekStartDate || undefined}
            onChange={(e) => setWeekEndDate(e.target.value)}
            error={!!errors.weekEndDate}
          />
        </FormField>
      </div>

      {errors._eligible && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          {errors._eligible}
        </div>
      )}

      {eligibleSummary && selectedDriver && !fetching && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-gray-400 space-y-1">
          <p>
            {eligibleSummary.loadsInPeriod ?? 0} load(s), {eligibleSummary.fuelTransactionsInPeriod ?? 0} fuel transaction(s),{' '}
            {eligibleSummary.tollTransactionsInPeriod ?? 0} toll transaction(s), {eligibleSummary.deductionsInPeriod ?? 0} deduction(s),{' '}
            {eligibleSummary.creditsInPeriod ?? 0} credit(s) in this period
          </p>
          <p className="text-gray-500">
            Loads, deductions, and credits are included when their dates fall within the selected period.
          </p>
        </div>
      )}

      {fetching ? (
        <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" /></div>
      ) : selectedDriver ? (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            {/* Loads */}
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border-color)] flex justify-between items-center bg-gray-500/5">
                <h4 className="font-semibold text-gray-200">Loads in Period</h4>
                {errors.loads && <span className="text-xs text-red-400">{errors.loads}</span>}
              </div>
              <div className="max-h-60 overflow-y-auto p-2">
                {eligibleLoads.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No loads in this period for this driver. Check dates or assign loads to this driver.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {eligibleLoads.map(load => (
                      <label key={load.id} className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border-color)] hover:border-blue-500/30 hover:bg-blue-500/5 cursor-pointer transition">
                        <input 
                          type="checkbox" 
                          className="mt-1" 
                          checked={selectedLoadIds.includes(load.id)} 
                          onChange={() => toggleLoad(load.id)} 
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-blue-400">{load.loadNumber}</span>
                              {getRoleBadge(load.role)}
                            </div>
                            <div className="text-right">
                              <span className="font-medium text-gray-200">{formatCurrency(load.totalRevenueCents)}</span>
                              <span className="text-xs text-gray-500 ml-2">→ {formatCurrency(load.calculatedGrossCents)}</span>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex gap-4">
                            <span>Delivered: {formatDate(load.deliveryDate)}</span>
                            <span>{load.miles} miles</span>
                            {load.companyCommissionCents > 0 && (
                              <span className="text-yellow-500">Commission: {formatCurrency(load.companyCommissionCents)}</span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Deductions */}
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border-color)] bg-gray-500/5">
                <h4 className="font-semibold text-gray-200">Fuel & Toll in Period</h4>
                <p className="text-[10px] text-gray-500 mt-0.5">Included when attached to selected load trucks</p>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {selectedFuelTransactions.length === 0 && selectedTollTransactions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No fuel/toll transactions for selected trucks</p>
                ) : (
                  <table className="w-full text-sm text-left">
                    <tbody>
                      {selectedFuelTransactions.map((t) => (
                        <tr key={`fuel-${t.id}`} className="border-b border-[var(--border-color)] last:border-0">
                          <td className="px-4 py-2 text-gray-300">Fuel</td>
                          <td className="px-4 py-2 text-gray-500">{t.merchant || t.fuelCard?.displayName || 'Fuel Card'} · Truck {t.truck?.unitNumber || ''}</td>
                          <td className="px-4 py-2 text-right text-red-400">-{formatCurrency(t.netAmount)}</td>
                        </tr>
                      ))}
                      {selectedTollTransactions.map((t) => (
                        <tr key={`toll-${t.id}`} className="border-b border-[var(--border-color)] last:border-0">
                          <td className="px-4 py-2 text-gray-300">Toll</td>
                          <td className="px-4 py-2 text-gray-500">{t.agency || t.location || t.description || 'Toll'} · Truck {t.truck?.unitNumber || ''}</td>
                          <td className="px-4 py-2 text-right text-red-400">-{formatCurrency(t.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Deductions */}
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border-color)] bg-gray-500/5">
                <h4 className="font-semibold text-gray-200">Deductions in Period</h4>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {eligibleDeductions.length === 0 && companyFeeCents === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No deductions in this period</p>
                ) : (
                  <table className="w-full text-sm text-left">
                    <tbody>
                      {eligibleDeductions.map(d => (
                        <tr key={d.id} className="border-b border-[var(--border-color)] last:border-0">
                          <td className="px-4 py-2 text-gray-300">{d.type}</td>
                          <td className="px-4 py-2 text-gray-500">{d.description}</td>
                          <td className="px-4 py-2 text-right text-red-400">-{formatCurrency(d.amount)}</td>
                        </tr>
                      ))}
                      {companyFeeCents > 0 && (
                        <tr className="border-b border-[var(--border-color)] last:border-0 bg-blue-500/5">
                          <td className="px-4 py-2 text-gray-300">{getCategoryLabel('COMPANY_FEE')}</td>
                          <td className="px-4 py-2 text-gray-500">Company Fee (automatic)</td>
                          <td className="px-4 py-2 text-right text-red-400">-{formatCurrency(companyFeeCents)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border-color)] bg-gray-500/5">
                <h4 className="font-semibold text-gray-200">Credits in Period</h4>
                <p className="text-[10px] text-gray-500 mt-0.5">Credits dated within this period</p>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {eligibleCredits.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No credits in this period</p>
                ) : (
                  <table className="w-full text-sm text-left">
                    <tbody>
                      {eligibleCredits.map((c) => (
                        <tr key={c.id} className="border-b border-[var(--border-color)] last:border-0">
                          <td className="px-4 py-2 text-gray-300">{c.type}</td>
                          <td className="px-4 py-2 text-gray-500">{c.description}</td>
                          <td className="px-4 py-2 text-right text-green-400">+{formatCurrency(c.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <FormField label="Settlement Notes">
              <FormTextarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes for driver..." />
            </FormField>
          </div>

          {/* Preview Panel */}
          <div className="col-span-1">
            <div className="card sticky top-0 bg-blue-500/[0.02] border-blue-500/20">
              <h4 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 15h0M2 9.5h20"/></svg>
                Statement Preview
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Selected Loads</span>
                  <span className="text-gray-200 font-medium">{selectedLoadIds.length}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Total Miles</span>
                  <span className="text-gray-200 font-medium">{selectedLoadsObj.reduce((s,l)=>s+l.miles,0).toLocaleString()}</span>
                </div>
                <div className="h-px bg-[var(--border-color)] my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Revenue</span>
                  <span className="text-gray-200 font-medium">{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-500">Company Commission</span>
                  <span className="text-yellow-400 font-medium">-{formatCurrency(totalCommission)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Gross Earning</span>
                  <span className="text-gray-200 font-medium">{formatCurrency(grossPayCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Fuel</span>
                  <span className="text-red-400 font-medium">-{formatCurrency(selectedFuelTransactions.reduce((sum, t) => sum + t.netAmount, 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Toll</span>
                  <span className="text-red-400 font-medium">-{formatCurrency(selectedTollTransactions.reduce((sum, t) => sum + t.amount, 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Company Fee</span>
                  <span className="text-red-400 font-medium">-{formatCurrency(companyFeeCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Deductions</span>
                  <span className="text-red-400 font-medium">-{formatCurrency(eligibleDeductions.reduce((sum, d) => sum + d.amount, 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Credits</span>
                  <span className="text-green-400 font-medium">+{formatCurrency(totalCreditsCents)}</span>
                </div>
                <div className="h-px bg-[var(--border-color)] my-2" />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-300 font-medium">Net Payout</span>
                  <span className={`text-2xl font-bold ${netPayCents >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(netPayCents)}</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 mt-4 leading-relaxed">
                Pay: {driver?.payStructure} 
                ({driver?.payStructure === 'PERCENTAGE' ? `${(driver.payRate/100).toFixed(0)}%` : driver?.payStructure === 'PER_MILE' ? `$${(driver.payRate/100).toFixed(2)}/mi` : 'Fixed'})
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-gray-500 border-2 border-dashed border-[var(--border-color)] rounded-xl">
          Select a driver to view eligible loads and generate a settlement
        </div>
      )}

      <ModalFooter>
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button
          onClick={handleSubmit}
          disabled={
            loading ||
            !selectedDriver ||
            (selectedLoadIds.length === 0 &&
              eligibleDeductions.length === 0 &&
              eligibleCredits.length === 0 &&
              selectedFuelTransactions.length === 0 &&
              selectedTollTransactions.length === 0 &&
              companyFeeCents === 0)
          }
          className="btn btn-primary"
        >
          {loading ? <span className="flex items-center gap-2"><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Generating...</span> : 'Generate Settlement'}
        </button>
      </ModalFooter>
    </Modal>
  );
}
