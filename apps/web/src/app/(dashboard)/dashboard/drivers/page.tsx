'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CreateDriverModal } from '@/components/forms/CreateDriverModal';
import { Toast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getApiErrorMessage } from '@/lib/api-errors';
import { logErrorDev } from '@/lib/logger';
import api from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  driverType: 'COMPANY_DRIVER' | 'OWNER_OPERATOR';
  payStructure: string;
  payRate: number;
  cdlNumber: string;
  cdlState: string;
  cdlExpiryDate: string;
  medicalCardExpiry: string;
  isActive: boolean;
  escrowBalance: number;
  truck: { id: string; unitNumber: string; make: string; model: string } | null;
  _count: { loads: number; settlements: number };
}

function ComplianceDot({ date }: { date: string }) {
  const now = new Date();
  const expiry = new Date(date);
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);

  let color = 'bg-green-500';
  if (expiry < now) color = 'bg-red-500 animate-pulse';
  else if (expiry <= thirtyDays) color = 'bg-yellow-500';

  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

function DriverTypeBadge({ type }: { type: string }) {
  if (type === 'OWNER_OPERATOR') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/15 text-purple-400 border border-purple-500/30">
        Owner Operator
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30">
      Company Driver
    </span>
  );
}

function PayRateDisplay({ driver }: { driver: Driver }) {
  if (driver.payStructure === 'PERCENTAGE') {
    return <span>{(driver.payRate / 100).toFixed(0)}%</span>;
  }
  if (driver.payStructure === 'PER_MILE') {
    return <span>${(driver.payRate / 100).toFixed(2)}/mi</span>;
  }
  return <span>${(driver.payRate / 100).toFixed(2)}</span>;
}

export default function DriversPage() {
  const { can, role } = usePermission();
  const manageDrivers = can('drivers:write');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [driverToRemove, setDriverToRemove] = useState<Driver | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchDrivers();
  }, [search, typeFilter]);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      const res = await api.get(`/drivers?${params}`);
      setDrivers(res.data.data);
    } catch (err) {
      logErrorDev('drivers', err);
      setFetchError(getApiErrorMessage(err, 'Failed to load drivers'));
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!driverToRemove) return;
    const name = `${driverToRemove.firstName} ${driverToRemove.lastName}`;
    setDeletingId(driverToRemove.id);
    try {
      await api.delete(`/drivers/${driverToRemove.id}`);
      setToast({ type: 'success', message: `${name} removed` });
      setDriverToRemove(null);
      fetchDrivers();
    } catch (err) {
      setToast({ type: 'error', message: getApiErrorMessage(err, 'Could not remove driver') });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Drivers"
        description="Manage your fleet drivers"
        actions={
          manageDrivers ? (
            <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add Driver
            </button>
          ) : undefined
        }
      />

      {/* Filters */}
      {role !== 'DRIVER' ? (
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            type="text"
            placeholder="Search drivers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input w-full sm:w-auto"
        >
          <option value="">All Types</option>
          <option value="OWNER_OPERATOR">Owner Operators</option>
          <option value="COMPANY_DRIVER">Company Drivers</option>
        </select>
      </div>
      ) : null}

      {fetchError && !loading ? (
        <ErrorState message={fetchError} onRetry={() => void fetchDrivers()} className="mb-6" />
      ) : null}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-4">
            <LoadingBlock rows={8} />
          </div>
        ) : drivers.length === 0 ? (
          <EmptyState
            title="No drivers found"
            description={search || typeFilter ? 'Try adjusting your filters.' : 'Add your first driver to get started.'}
            action={
              manageDrivers ? (
                <button type="button" className="btn btn-primary text-sm" onClick={() => setShowCreate(true)}>
                  Add Driver
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto sm:overflow-visible">
            <table className="data-table mobile-card-table">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Type</th>
                  <th>Pay Rate</th>
                  <th>CDL</th>
                  <th>Truck</th>
                  <th>Compliance</th>
                  <th>Deposit</th>
                  <th>Loads</th>
                  <th className="w-28 text-right">{manageDrivers ? 'Actions' : ''}</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver) => (
                  <tr key={driver.id}>
                    <td data-primary="true">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-xs font-bold text-gray-300">
                          {driver.firstName[0]}{driver.lastName[0]}
                        </div>
                        <div>
                          <Link href={`/dashboard/drivers/${driver.id}`} className="font-medium text-blue-400 hover:text-blue-300">
                            {driver.firstName} {driver.lastName}
                          </Link>
                          <p className="text-xs text-gray-500">{driver.email || driver.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td data-label="Type"><DriverTypeBadge type={driver.driverType} /></td>
                    <td data-label="Pay Rate" className="font-medium text-gray-300"><PayRateDisplay driver={driver} /></td>
                    <td data-label="CDL">
                      <div>
                        <p className="text-xs text-gray-300">{driver.cdlNumber}</p>
                        <p className="text-xs text-gray-500">{driver.cdlState} · Exp: {formatDate(driver.cdlExpiryDate)}</p>
                      </div>
                    </td>
                    <td data-label="Truck">
                      {driver.truck ? (
                        <span className="text-sm text-gray-300">{driver.truck.unitNumber}</span>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                    <td data-label="Compliance">
                      <div className="flex items-center gap-2">
                        <ComplianceDot date={driver.cdlExpiryDate} />
                        <ComplianceDot date={driver.medicalCardExpiry} />
                      </div>
                    </td>
                    <td data-label="Deposit" className="text-gray-400">{formatCurrency(driver.escrowBalance ?? 0)}</td>
                    <td data-label="Loads" className="text-gray-400">{driver._count.loads}</td>
                    <td data-actions="true" className="text-right space-x-3">
                      <Link href={`/dashboard/drivers/${driver.id}`} className="text-xs text-gray-500 hover:text-blue-400 transition">
                        View
                      </Link>
                      {manageDrivers ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditingDriverId(driver.id)}
                            className="text-xs text-gray-500 hover:text-blue-400 transition"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === driver.id}
                            onClick={() => setDriverToRemove(driver)}
                            className="text-xs text-gray-500 hover:text-red-400 transition disabled:opacity-50"
                          >
                            {deletingId === driver.id ? 'Removing...' : 'Remove'}
                          </button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateDriverModal
        isOpen={manageDrivers && (showCreate || Boolean(editingDriverId))}
        driverId={editingDriverId}
        onClose={() => {
          setShowCreate(false);
          setEditingDriverId(null);
        }}
        onSuccess={() => {
          fetchDrivers();
          setToast({
            type: 'success',
            message: editingDriverId ? 'Driver updated successfully!' : 'Driver created successfully!',
          });
          setEditingDriverId(null);
          setShowCreate(false);
        }}
      />

      <ConfirmDialog
        open={Boolean(driverToRemove)}
        title="Remove driver?"
        message={
          driverToRemove
            ? `Remove ${driverToRemove.firstName} ${driverToRemove.lastName}? They will be deactivated and hidden from the active list. Past loads and settlements are kept.`
            : ''
        }
        confirmLabel="Remove"
        variant="danger"
        loading={Boolean(deletingId)}
        onCancel={() => !deletingId && setDriverToRemove(null)}
        onConfirm={() => void handleConfirmRemove()}
      />

      {toast ? <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
