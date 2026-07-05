'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatCurrency, formatDateTimeAmPm } from '@/lib/utils';
import { CreateLoadModal } from '@/components/forms/CreateLoadModal';
import { Toast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api-errors';
import { logErrorDev } from '@/lib/logger';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/api';

interface Load {
  id: string;
  loadNumber: string;
  status: string;
  brokerName: string;
  pickupCity: string;
  pickupState: string;
  deliveryCity: string;
  deliveryState: string;
  pickupDate: string;
  deliveryDate: string;
  miles: number;
  totalRevenueCents: number;
  driver: { id: string; firstName: string; lastName: string } | null;
  truck: { id: string; unitNumber: string } | null;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { class: string; label: string }> = {
    PENDING: { class: 'badge-yellow', label: 'Pending' },
    IN_TRANSIT: { class: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30', label: 'In Transit' },
    DELIVERED: { class: 'badge-green', label: 'Delivered' },
    TONU: { class: 'bg-purple-500/15 text-purple-400 border border-purple-500/30', label: 'TONU' },
    CANCELLED: { class: 'badge-red', label: 'Cancelled' },
  };
  const c = config[status] || config.PENDING;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.class}`}>{c.label}</span>;
}

export default function LoadsPage() {
  const { can } = usePermission();
  const dispatchLoad = can('loads:dispatch');
  const canDeleteLoad = can('loads:dispatch');
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingLoadId, setEditingLoadId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [loadToDelete, setLoadToDelete] = useState<Load | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchLoads = async () => {
    setLoading(true);
    setFetchError(null);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (search) params.set('search', search);
    try {
      const res = await api.get(`/loads?${params}`);
      setLoads(res.data.data);
    } catch (err) {
      logErrorDev('loads', err);
      setFetchError(getApiErrorMessage(err, 'Failed to load loads'));
      setLoads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoads();
  }, [statusFilter, search]);

  const handleConfirmDelete = async () => {
    if (!loadToDelete) return;
    setDeletingId(loadToDelete.id);
    try {
      await api.delete(`/loads/${loadToDelete.id}`);
      setLoadToDelete(null);
      fetchLoads();
      setToast({ type: 'success', message: 'Load deleted successfully' });
    } catch (err) {
      setToast({ type: 'error', message: getApiErrorMessage(err, 'Failed to delete load') });
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (loadId: string, status: string) => {
    setUpdatingStatusId(loadId);
    try {
      await api.patch(`/loads/${loadId}`, { status });
      fetchLoads();
      setToast({ type: 'success', message: 'Status updated' });
    } catch (err) {
      setToast({ type: 'error', message: getApiErrorMessage(err, 'Failed to update status') });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Loads"
        description="Manage freight loads and dispatch"
        actions={
          dispatchLoad ? (
            <button className="btn btn-primary" type="button" onClick={() => setShowCreate(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Create Load
            </button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input type="text" placeholder="Search loads..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-full sm:w-auto">
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="IN_TRANSIT">In Transit</option>
          <option value="DELIVERED">Delivered</option>
          <option value="TONU">TONU</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {fetchError && !loading ? (
        <ErrorState message={fetchError} onRetry={() => void fetchLoads()} className="mb-6" />
      ) : null}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-4">
            <LoadingBlock rows={8} />
          </div>
        ) : loads.length === 0 ? (
          <EmptyState
            title="No loads found"
            description={search || statusFilter ? 'Try adjusting your filters.' : 'Create your first load to get started.'}
            action={
              dispatchLoad ? (
                <button type="button" className="btn btn-primary text-sm" onClick={() => setShowCreate(true)}>
                  Create Load
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto sm:overflow-visible">
            <table className="data-table mobile-card-table">
              <thead>
                <tr>
                  <th>Load #</th>
                  <th>Broker</th>
                  <th>Route</th>
                  <th>Pickup</th>
                  <th>Driver</th>
                  <th>Truck</th>
                  <th>Miles</th>
                  <th>Revenue</th>
                  <th>Status</th>
                  <th className="w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loads.map((load) => (
                  <tr key={load.id}>
                    <td data-primary="true" className="font-medium text-blue-400">{load.loadNumber}</td>
                    <td data-label="Broker" className="text-gray-300">{load.brokerName}</td>
                    <td data-label="Route" className="text-sm text-gray-400">
                      {load.pickupCity}, {load.pickupState} → {load.deliveryCity}, {load.deliveryState}
                    </td>
                    <td data-label="Pickup" className="text-gray-500 text-sm">{formatDateTimeAmPm(load.pickupDate)}</td>
                    <td data-label="Driver" className="text-gray-300">
                      {load.driver ? `${load.driver.firstName} ${load.driver.lastName}` : '—'}
                    </td>
                    <td data-label="Truck" className="text-gray-400">{load.truck?.unitNumber || '—'}</td>
                    <td data-label="Miles" className="text-gray-400">{load.miles.toLocaleString()}</td>
                    <td data-label="Revenue" className="font-medium text-gray-200">{formatCurrency(load.totalRevenueCents)}</td>
                    <td data-label="Status">
                      {!dispatchLoad || load.status === 'CANCELLED' ? (
                        <StatusBadge status={load.status} />
                      ) : (
                        <select
                          value={load.status}
                          disabled={updatingStatusId === load.id}
                          onChange={(e) => void handleStatusChange(load.id, e.target.value)}
                          className="input py-1 px-2 text-xs w-auto min-w-[7rem]"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_TRANSIT">In Transit</option>
                          <option value="DELIVERED">Delivered</option>
                          <option value="TONU">TONU</option>
                        </select>
                      )}
                    </td>
                    <td data-actions="true" className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        {dispatchLoad ? (
                          <button
                            type="button"
                            onClick={() => setEditingLoadId(load.id)}
                            className="text-xs text-gray-500 hover:text-blue-400 transition"
                          >
                            Edit
                          </button>
                        ) : null}
                        {canDeleteLoad ? (
                          <button
                            type="button"
                            disabled={deletingId === load.id}
                            onClick={() => setLoadToDelete(load)}
                            className="text-xs text-gray-500 hover:text-red-400 transition disabled:opacity-50"
                          >
                            {deletingId === load.id ? 'Deleting...' : 'Delete'}
                          </button>
                        ) : null}
                        {!dispatchLoad && !canDeleteLoad ? (
                          <span className="text-xs text-gray-600">—</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateLoadModal
        isOpen={showCreate && dispatchLoad}
        onClose={() => setShowCreate(false)}
        onSuccess={() => { fetchLoads(); setToast({ type: 'success', message: 'Load created successfully!' }); }}
      />

      <CreateLoadModal
        isOpen={Boolean(editingLoadId) && dispatchLoad}
        loadId={editingLoadId}
        onClose={() => setEditingLoadId(null)}
        onSuccess={() => {
          fetchLoads();
          setEditingLoadId(null);
          setToast({ type: 'success', message: 'Load updated successfully!' });
        }}
      />

      <ConfirmDialog
        open={Boolean(loadToDelete)}
        title="Delete load?"
        message={
          loadToDelete
            ? `Permanently delete load ${loadToDelete.loadNumber}? This cannot be undone. Loads on finalized or paid settlements cannot be deleted.`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
        loading={Boolean(deletingId)}
        onCancel={() => !deletingId && setLoadToDelete(null)}
        onConfirm={() => void handleConfirmDelete()}
      />

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
