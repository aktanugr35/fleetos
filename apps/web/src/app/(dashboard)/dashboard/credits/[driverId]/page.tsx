'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CreditRecord, getCreditTypeLabel } from '@/lib/credits';
import { CreateCreditModal } from '@/components/forms/CreateCreditModal';
import { Toast } from '@/components/ui/Toast';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/api';

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  driverType: string;
  truck: { unitNumber: string } | null;
}

export default function DriverCreditsPage() {
  const params = useParams();
  const driverId = params.driverId as string;
  const { can } = usePermission();
  const canEdit = can('financial:write');

  const [driver, setDriver] = useState<Driver | null>(null);
  const [credits, setCredits] = useState<CreditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCredit, setEditingCredit] = useState<CreditRecord | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [driverRes, creditsRes] = await Promise.all([
        api.get(`/drivers/${driverId}`),
        api.get(`/credits?driverId=${driverId}&limit=200`),
      ]);
      setDriver(driverRes.data.data);
      setCredits(creditsRes.data.data);
    } catch {
      setDriver(null);
      setCredits([]);
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalAmount = useMemo(
    () => credits.reduce((sum, c) => sum + c.amount, 0),
    [credits]
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this credit?')) return;
    try {
      await api.delete(`/credits/${id}`);
      setToast({ type: 'success', message: 'Credit deleted' });
      fetchData();
    } catch {
      setToast({ type: 'error', message: 'Could not delete credit' });
    }
  };

  const driverName = driver ? `${driver.firstName} ${driver.lastName}` : 'Driver';
  const modalOpen = canEdit && (showCreate || Boolean(editingCredit));

  return (
    <div>
      <Link
        href="/dashboard/credits"
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
            : 'Driver credits'
        }
        actions={
          canEdit ? (
            <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Credit
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Records</p>
          <p className="text-2xl font-bold text-gray-100 mt-1">{credits.length}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Amount</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{formatCurrency(totalAmount)}</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : !driver ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <p className="text-sm">Driver not found</p>
            <Link href="/dashboard/credits" className="text-blue-400 text-sm mt-2 hover:underline">
              Back to drivers
            </Link>
          </div>
        ) : credits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <p className="text-sm">No credits for this driver yet</p>
            {canEdit ? (
              <button type="button" className="btn btn-primary mt-4" onClick={() => setShowCreate(true)}>
                Add first credit
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {credits.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="text-xs bg-green-500/10 px-2 py-0.5 rounded text-green-400">
                        {getCreditTypeLabel(c.type)}
                      </span>
                    </td>
                    <td className="text-gray-400 max-w-xs truncate">{c.description}</td>
                    <td className="font-medium text-green-400">+{formatCurrency(c.amount)}</td>
                    <td className="text-gray-500 text-sm">{formatDate(c.date)}</td>
                    <td className="text-right space-x-3">
                      {canEdit ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditingCredit(c)}
                            className="text-xs text-gray-500 hover:text-blue-400 transition"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id)}
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
        <CreateCreditModal
          isOpen={modalOpen}
          onClose={() => {
            setShowCreate(false);
            setEditingCredit(null);
          }}
          driverId={driver.id}
          driverName={driverName}
          credit={editingCredit}
          onSuccess={() => {
            fetchData();
            setToast({
              type: 'success',
              message: editingCredit ? 'Credit updated' : 'Credit added successfully!',
            });
            setEditingCredit(null);
            setShowCreate(false);
          }}
        />
      )}

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
