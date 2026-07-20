'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { CreateLoadModal } from '@/components/forms/CreateLoadModal';
import { Toast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api-errors';
import { logErrorDev } from '@/lib/logger';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal } from '@/components/ui/Modal';
import { usePermission } from '@/hooks/usePermission';
import { formatCurrency, formatDateTimeAmPm } from '@/lib/utils';
import api from '@/lib/api';
import { LoadRow } from '@/components/loads/LoadRow';
import { LoadStatusBadge } from '@/components/loads/LoadStatusBadge';
import {
  type LoadListItem,
  type LoadStats,
  type LoadStatus,
  type StatusFilter,
  type DatePreset,
  type PaginationMeta,
  STATUS_FILTERS,
  buildLoadQueryParams,
  groupLoadsByDriver,
  formatRoute,
} from '@/lib/loads';

type ViewMode = 'list' | 'group';

interface DriverOption {
  id: string;
  firstName: string;
  lastName: string;
}

const GROUP_FETCH_LIMIT = 250;
const PAGE_SIZE = 25;

function KpiCard({
  label,
  value,
  sub,
  accent,
  active,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`card text-left transition ${onClick ? 'hover:border-[var(--brand-amber)] cursor-pointer' : ''} ${
        active ? 'ring-2 ring-[var(--brand-amber)]/40' : ''
      }`}
    >
      <div className={`text-2xl font-bold ${accent}`}>{value}</div>
      <div className="mt-0.5 text-xs text-[var(--text-muted)]">{label}</div>
      {sub && <div className="mt-1 text-[10px] text-[var(--text-muted)]">{sub}</div>}
    </Tag>
  );
}

export default function LoadsPage() {
  const { can } = usePermission();
  const dispatchLoad = can('loads:dispatch');
  const canDeleteLoad = can('loads:dispatch');

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [loads, setLoads] = useState<LoadListItem[]>([]);
  const [stats, setStats] = useState<LoadStats | null>(null);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');
  const [driverFilter, setDriverFilter] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editingLoadId, setEditingLoadId] = useState<string | null>(null);
  const [detailLoad, setDetailLoad] = useState<LoadListItem | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [loadToDelete, setLoadToDelete] = useState<LoadListItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/loads/stats');
      setStats(res.data.data);
    } catch (err) {
      logErrorDev('loads-stats', err);
    }
  }, []);

  const fetchDrivers = useCallback(async () => {
    try {
      const res = await api.get('/drivers?status=active&limit=200');
      setDrivers(res.data.data ?? []);
    } catch (err) {
      logErrorDev('loads-drivers', err);
    }
  }, []);

  const fetchLoads = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const params = buildLoadQueryParams({
      statusFilter,
      driverId: driverFilter,
      search,
      datePreset,
      page: viewMode === 'list' ? page : 1,
      limit: viewMode === 'list' ? PAGE_SIZE : GROUP_FETCH_LIMIT,
    });
    try {
      const res = await api.get('/loads', { params });
      setLoads(res.data.data ?? []);
      setMeta(res.data.meta ?? null);
    } catch (err) {
      logErrorDev('loads', err);
      setFetchError(getApiErrorMessage(err, 'Failed to load loads'));
      setLoads([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, driverFilter, search, datePreset, page, viewMode]);

  useEffect(() => {
    void fetchStats();
    void fetchDrivers();
  }, [fetchStats, fetchDrivers]);

  useEffect(() => {
    void fetchLoads();
  }, [fetchLoads]);

  const driverGroups = useMemo(
    () => (viewMode === 'group' ? groupLoadsByDriver(loads) : []),
    [loads, viewMode],
  );

  const handleStatusChange = async (loadId: string, status: LoadStatus) => {
    setUpdatingStatusId(loadId);
    try {
      await api.patch(`/loads/${loadId}`, { status });
      await Promise.all([fetchLoads(), fetchStats()]);
      setToast({ type: 'success', message: 'Status updated' });
      if (detailLoad?.id === loadId) {
        setDetailLoad((prev) => (prev ? { ...prev, status } : null));
      }
    } catch (err) {
      setToast({ type: 'error', message: getApiErrorMessage(err, 'Failed to update status') });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!loadToDelete) return;
    setDeletingId(loadToDelete.id);
    try {
      await api.delete(`/loads/${loadToDelete.id}`);
      setLoadToDelete(null);
      setDetailLoad(null);
      await Promise.all([fetchLoads(), fetchStats()]);
      setToast({ type: 'success', message: 'Load deleted successfully' });
    } catch (err) {
      setToast({ type: 'error', message: getApiErrorMessage(err, 'Failed to delete load') });
    } finally {
      setDeletingId(null);
    }
  };

  const rowHandlers = (load: LoadListItem) => ({
    canDispatch: dispatchLoad,
    canDelete: canDeleteLoad,
    updating: updatingStatusId === load.id,
    deleting: deletingId === load.id,
    onEdit: () => setEditingLoadId(load.id),
    onDelete: () => setLoadToDelete(load),
    onStatusChange: (status: LoadStatus) => void handleStatusChange(load.id, status),
    onSelect: () => setDetailLoad(load),
  });

  return (
    <div>
      <PageHeader
        title="Loads"
        description="Freight board — track active loads, routes, and revenue"
        actions={
          dispatchLoad ? (
            <button className="btn btn-primary" type="button" onClick={() => setShowCreate(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create Load
            </button>
          ) : undefined
        }
      />

      {/* KPI strip */}
      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="Pending"
            value={stats.pending}
            accent="text-amber-500"
            active={statusFilter === 'PENDING'}
            onClick={() => {
              setStatusFilter('PENDING');
              setPage(1);
            }}
          />
          <KpiCard
            label="In transit"
            value={stats.inTransit}
            accent="text-[var(--brand-teal)]"
            active={statusFilter === 'IN_TRANSIT'}
            onClick={() => {
              setStatusFilter('IN_TRANSIT');
              setPage(1);
            }}
          />
          <KpiCard
            label="Delivered"
            value={stats.delivered}
            accent="text-emerald-500"
            active={statusFilter === 'DELIVERED'}
            onClick={() => {
              setStatusFilter('DELIVERED');
              setPage(1);
            }}
          />
          <KpiCard
            label="Delivered revenue"
            value={formatCurrency(stats.totalRevenueCents)}
            sub="All time"
            accent="text-[var(--text-primary)]"
          />
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-0.5">
            {(['list', 'group'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setViewMode(mode);
                  setPage(1);
                }}
                className={`rounded-md px-3.5 py-1.5 text-sm font-medium capitalize transition ${
                  viewMode === mode
                    ? 'bg-[var(--brand-amber)] text-[#1a1206]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {mode === 'list' ? 'List' : 'By driver'}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {(['week', 'month', 'all'] as DatePreset[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setDatePreset(p);
                  setPage(1);
                }}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  datePreset === p
                    ? 'border-[var(--brand-teal)] bg-[color-mix(in_srgb,var(--brand-teal)_12%,transparent)] text-[var(--brand-teal)]'
                    : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {p === 'week' ? 'This week' : p === 'month' ? 'This month' : 'All time'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SearchInput
            wrapperClassName="min-w-[200px] flex-1 sm:max-w-xs"
            placeholder="Search load #, broker, city…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <select
            value={driverFilter}
            onChange={(e) => {
              setDriverFilter(e.target.value);
              setPage(1);
            }}
            className="input w-full sm:w-auto sm:min-w-[11rem]"
          >
            <option value="">All drivers</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.firstName} {d.lastName}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value || 'all'}
                type="button"
                onClick={() => {
                  setStatusFilter(f.value);
                  setPage(1);
                }}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  statusFilter === f.value
                    ? 'border-[var(--brand-amber)] bg-[color-mix(in_srgb,var(--brand-amber)_15%,transparent)] text-[var(--brand-amber)]'
                    : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
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
            description={
              search || statusFilter || driverFilter || datePreset !== 'all'
                ? 'Try adjusting your filters.'
                : 'Create your first load to get started.'
            }
            action={
              dispatchLoad ? (
                <button type="button" className="btn btn-primary text-sm" onClick={() => setShowCreate(true)}>
                  Create Load
                </button>
              ) : undefined
            }
          />
        ) : viewMode === 'list' ? (
          <>
            {loads.map((load) => (
              <LoadRow key={load.id} load={load} {...rowHandlers(load)} />
            ))}
          </>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {driverGroups.map((group) => (
              <div key={group.driverId}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2.5">
                  <div>
                    <span className="font-semibold text-[var(--text-primary)]">{group.driverName}</span>
                    <span className="ml-2 text-xs text-[var(--text-muted)]">
                      {group.loads.length} load{group.loads.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-[var(--text-secondary)]">
                    <span>{group.totalMiles.toLocaleString()} mi</span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {formatCurrency(group.totalRevenueCents)}
                    </span>
                  </div>
                </div>
                {group.loads.map((load) => (
                  <LoadRow key={load.id} load={load} compact {...rowHandlers(load)} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination (list view only) */}
      {viewMode === 'list' && meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-[var(--text-muted)]">
          <span>
            {meta.total} load{meta.total === 1 ? '' : 's'} · page {meta.page} of {meta.totalPages}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={!meta.hasPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn-secondary px-3 py-1 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={!meta.hasNext}
              onClick={() => setPage((p) => p + 1)}
              className="btn-secondary px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {viewMode === 'group' && loads.length > 0 && (
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Showing up to {GROUP_FETCH_LIMIT} loads matching filters, grouped by driver.
        </p>
      )}

      {/* Detail modal */}
      {detailLoad && (
        <Modal
          isOpen
          onClose={() => setDetailLoad(null)}
          title={detailLoad.loadNumber}
          description={detailLoad.brokerName}
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <LoadStatusBadge status={detailLoad.status} />
              <span className="text-lg font-semibold text-[var(--text-primary)]">
                {formatCurrency(detailLoad.totalRevenueCents)}
              </span>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Route</div>
              <div className="mt-1 text-[var(--text-primary)]">{formatRoute(detailLoad)}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-[var(--text-muted)]">Pickup</div>
                <div className="text-[var(--text-secondary)]">{formatDateTimeAmPm(detailLoad.pickupDate)}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)]">Delivery</div>
                <div className="text-[var(--text-secondary)]">
                  {detailLoad.deliveryDate ? formatDateTimeAmPm(detailLoad.deliveryDate) : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)]">Driver</div>
                <div className="text-[var(--text-secondary)]">
                  {detailLoad.driver
                    ? `${detailLoad.driver.firstName} ${detailLoad.driver.lastName}`
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)]">Truck</div>
                <div className="text-[var(--text-secondary)]">
                  {detailLoad.truck ? `Unit ${detailLoad.truck.unitNumber}` : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)]">Miles</div>
                <div className="text-[var(--text-secondary)]">{(detailLoad.miles ?? 0).toLocaleString()}</div>
              </div>
            </div>
            {dispatchLoad && detailLoad.status !== 'CANCELLED' && (
              <div className="flex flex-wrap gap-2 border-t border-[var(--border-color)] pt-4">
                <button type="button" className="btn-secondary text-sm" onClick={() => setEditingLoadId(detailLoad.id)}>
                  Edit
                </button>
                {(['PENDING', 'IN_TRANSIT', 'DELIVERED', 'TONU'] as LoadStatus[])
                  .filter((s) => s !== detailLoad.status)
                  .map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={updatingStatusId === detailLoad.id}
                      className="btn-secondary text-sm"
                      onClick={() => void handleStatusChange(detailLoad.id, s)}
                    >
                      Mark {s.replace('_', ' ').toLowerCase()}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      <CreateLoadModal
        isOpen={showCreate && dispatchLoad}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          void fetchLoads();
          void fetchStats();
          setToast({ type: 'success', message: 'Load created successfully!' });
        }}
      />

      <CreateLoadModal
        isOpen={Boolean(editingLoadId) && dispatchLoad}
        loadId={editingLoadId}
        onClose={() => setEditingLoadId(null)}
        onSuccess={() => {
          void fetchLoads();
          void fetchStats();
          setEditingLoadId(null);
          setDetailLoad(null);
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
