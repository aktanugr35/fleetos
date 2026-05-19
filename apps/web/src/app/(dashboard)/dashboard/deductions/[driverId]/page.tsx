'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DeductionRecord, getCategoryLabel } from '@/lib/deductions';
import { CreateDeductionModal } from '@/components/forms/CreateDeductionModal';
import { Toast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getApiErrorMessage } from '@/lib/api-errors';
import { logErrorDev } from '@/lib/logger';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/api';

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  driverType: string;
  truck: { unitNumber: string } | null;
}

export default function DriverDeductionsPage() {
  const params = useParams();
  const driverId = params.driverId as string;
  const { can } = usePermission();
  const canEdit = can('financial:write');

  const [driver, setDriver] = useState<Driver | null>(null);
  const [deductions, setDeductions] = useState<DeductionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<DeductionRecord | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deductionToDelete, setDeductionToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [driverRes, deductionsRes] = await Promise.all([
        api.get(`/drivers/${driverId}`),
        api.get(`/deductions?driverId=${driverId}&limit=200`),
      ]);
      setDriver(driverRes.data.data);
      setDeductions(deductionsRes.data.data);
    } catch (err) {
      logErrorDev('deductions', err);
      setFetchError(getApiErrorMessage(err, 'Failed to load deductions'));
      setDriver(null);
      setDeductions([]);
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalAmount = useMemo(
    () => deductions.reduce((sum, d) => sum + d.amount, 0),
    [deductions]
  );

  const handleConfirmDelete = async () => {
    if (!deductionToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/deductions/${deductionToDelete}`);
      setToast({ type: 'success', message: 'Deduction deleted' });
      setDeductionToDelete(null);
      fetchData();
    } catch (err) {
      setToast({ type: 'error', message: getApiErrorMessage(err, 'Could not delete deduction') });
    } finally {
      setDeleting(false);
    }
  };

  const driverName = driver ? `${driver.firstName} ${driver.lastName}` : 'Driver';
  const modalOpen = canEdit && (showCreate || Boolean(editingDeduction));

  return (
    <div>
      <Link
        href="/dashboard/deductions"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 mb-4 transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        All drivers
      </Link>

      <PageHeader
        title={driverName}
        description={
          driver
            ? `${driver.driverType === 'OWNER_OPERATOR' ? 'Owner Operator' : 'Company Driver'}${
                driver.truck ? ` · Truck ${driver.truck.unitNumber}` : ''
              }`
            : 'Driver deductions'
        }
        actions={
          canEdit ? (
            <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Deduction
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Records</p>
          <p className="text-2xl font-bold text-gray-100 mt-1">{deductions.length}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Amount</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{formatCurrency(totalAmount)}</p>
        </div>
      </div>

      {fetchError && !loading ? (
        <ErrorState message={fetchError} onRetry={() => void fetchData()} className="mb-6" />
      ) : null}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-4">
            <LoadingBlock rows={6} />
          </div>
        ) : !driver && !fetchError ? (
          <EmptyState
            title="Driver not found"
            description="This driver may have been removed."
            action={
              <Link href="/dashboard/deductions" className="btn btn-secondary text-sm">
                Back to drivers
              </Link>
            }
          />
        ) : deductions.length === 0 ? (
          <EmptyState
            title="No deductions yet"
            description="Add a deduction for this driver."
            action={
              canEdit ? (
                <button type="button" className="btn btn-primary text-sm" onClick={() => setShowCreate(true)}>
                  Add first deduction
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Recurring</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deductions.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span className="text-xs bg-gray-500/10 px-2 py-0.5 rounded text-gray-400">
                        {getCategoryLabel(d.type)}
                      </span>
                    </td>
                    <td className="text-gray-400 max-w-xs truncate">{d.description}</td>
                    <td className="font-medium text-red-400">-{formatCurrency(d.amount)}</td>
                    <td className="text-gray-500 text-sm">{formatDate(d.date)}</td>
                    <td>
                      {d.isRecurring ? (
                        <span className="text-xs text-blue-400">Yes</span>
                      ) : (
                        <span className="text-xs text-gray-600">No</span>
                      )}
                    </td>
                    <td className="text-right space-x-3">
                      {canEdit ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditingDeduction(d)}
                            className="text-xs text-gray-500 hover:text-blue-400 transition"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeductionToDelete(d.id)}
                            className="text-xs text-gray-500 hover:text-red-400 transition"
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {driver && (
        <CreateDeductionModal
          isOpen={modalOpen}
          onClose={() => {
            setShowCreate(false);
            setEditingDeduction(null);
          }}
          driverId={driver.id}
          driverName={driverName}
          deduction={editingDeduction}
          onSuccess={() => {
            fetchData();
            setToast({
              type: 'success',
              message: editingDeduction ? 'Deduction updated' : 'Deduction added successfully!',
            });
            setEditingDeduction(null);
            setShowCreate(false);
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deductionToDelete)}
        title="Delete deduction?"
        message="This deduction will be permanently removed."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onCancel={() => !deleting && setDeductionToDelete(null)}
        onConfirm={() => void handleConfirmDelete()}
      />

      {toast ? <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
