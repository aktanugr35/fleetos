'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { CreateDispatcherSettlementModal } from '@/components/forms/CreateDispatcherSettlementModal';
import { SettlementStatus } from '@haulyard/shared-types';
import { Toast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/api';

interface DispatcherSettlementRow {
  id: string;
  statementNumber: string | null;
  status: SettlementStatus;
  periodStart: string;
  periodEnd: string;
  netAmount: number;
  dispatcher: { firstName: string; lastName: string; commissionRate: number };
  _count?: { lines: number };
  createdAt: string;
  pdfUrl?: string | null;
}

function StatusBadge({ status }: { status: SettlementStatus }) {
  const styles: Record<SettlementStatus, string> = {
    [SettlementStatus.DRAFT]: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
    [SettlementStatus.FINALIZED]: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    [SettlementStatus.PAID]: 'bg-green-500/15 text-green-300 border-green-500/30',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function DispatcherSettlementsPage() {
  const { can } = usePermission();
  const canGenerate = can('dispatcher-settlements:create');
  const canFinalize = can('dispatcher-settlements:finalize');
  const canList = can('dispatcher-settlements:list');

  const [settlements, setSettlements] = useState<DispatcherSettlementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const load = useCallback(async () => {
    if (!canList) {
      setSettlements([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/dispatcher-settlements?limit=50');
      setSettlements(res.data.data as DispatcherSettlementRow[]);
    } catch {
      setSettlements([]);
    } finally {
      setLoading(false);
    }
  }, [canList]);

  useEffect(() => {
    void load();
  }, [load]);

  const finalize = async (id: string) => {
    try {
      await api.patch(`/dispatcher-settlements/${id}/approve`);
      setToast({ type: 'success', message: 'Dispatcher statement finalized' });
      await load();
    } catch {
      setToast({ type: 'error', message: 'Could not finalize statement' });
    }
  };

  const markPaid = async (id: string) => {
    try {
      await api.patch(`/dispatcher-settlements/${id}/paid`);
      setToast({ type: 'success', message: 'Marked as paid' });
      await load();
    } catch {
      setToast({ type: 'error', message: 'Could not mark as paid' });
    }
  };

  const downloadPdf = async (id: string, statementNumber: string | null) => {
    try {
      const res = await api.get(`/dispatcher-settlements/${id}/pdf/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `dispatcher_${statementNumber || id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setToast({ type: 'error', message: 'PDF not available' });
    }
  };

  return (
    <div>
      <PageHeader
        title="Dispatcher Settlements"
        description="Weekly commission statements for booked loads"
        actions={
          canGenerate ? (
            <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
              New dispatcher settlement
            </button>
          ) : undefined
        }
      />

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : settlements.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            {canGenerate ? 'No dispatcher statements yet.' : 'No dispatcher statements to display.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table mobile-card-table">
              <thead>
                <tr>
                  <th>Statement</th>
                  <th>Dispatcher</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Payout</th>
                  <th>Loads</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {settlements.map((s) => (
                  <tr key={s.id}>
                    <td data-label="Statement">{s.statementNumber || s.id.slice(0, 8)}</td>
                    <td data-label="Dispatcher">{s.dispatcher.firstName} {s.dispatcher.lastName}</td>
                    <td data-label="Period">{formatDate(s.periodStart)} – {formatDate(s.periodEnd)}</td>
                    <td data-label="Status"><StatusBadge status={s.status} /></td>
                    <td data-label="Payout">{formatCurrency(s.netAmount)}</td>
                    <td data-label="Loads">{s._count?.lines ?? 0}</td>
                    <td data-label="Actions" className="text-right space-x-2">
                      {s.pdfUrl ? (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void downloadPdf(s.id, s.statementNumber)}>
                          PDF
                        </button>
                      ) : null}
                      {canFinalize && s.status === SettlementStatus.DRAFT ? (
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => void finalize(s.id)}>
                          Finalize
                        </button>
                      ) : null}
                      {canFinalize && s.status === SettlementStatus.FINALIZED ? (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void markPaid(s.id)}>
                          Mark paid
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateDispatcherSettlementModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          setToast({ type: 'success', message: 'Dispatcher settlement created' });
          void load();
        }}
      />
      {toast ? <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
