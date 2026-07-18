'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { CreateSettlementModal } from '@/components/forms/CreateSettlementModal';
import { SettlementDetailModal } from '@/components/settlements/SettlementDetailModal';
import { SettlementStatus, type SettlementSummary } from '@haulyard/shared-types';
import { Toast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/api';

interface SettlementRow extends SettlementSummary {
  _count?: { lines: number; deductions: number; credits: number };
  createdAt: string;
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

export default function SettlementsPage() {
  const { can } = usePermission();
  const canGenerate = can('settlements:create');
  const canList = can('settlements:list');

  const [settlements, setSettlements] = useState<SettlementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const load = useCallback(async () => {
    if (!canList) {
      setSettlements([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/settlements?limit=50');
      setSettlements(res.data.data as SettlementRow[]);
    } catch {
      setSettlements([]);
    } finally {
      setLoading(false);
    }
  }, [canList]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Settlements"
        description="Weekly driver statements — draft, finalize, and download PDFs"
        actions={
          canGenerate ? (
            <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New settlement
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
            {canGenerate
              ? 'No settlements yet. Create one to get started.'
              : 'No settlements to display.'}
          </div>
        ) : (
          <div className="overflow-x-auto sm:overflow-visible">
            <table className="data-table mobile-card-table">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Statement</th>
                  <th className="px-4 py-3 font-medium">Driver</th>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Net</th>
                  <th className="px-4 py-3 font-medium text-right">Loads</th>
                  <th className="px-4 py-3 font-medium">PDF</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-[var(--border-color)] last:border-0 hover:bg-white/5 cursor-pointer transition"
                    onClick={() => setDetailId(s.id)}
                  >
                    <td data-primary="true" className="px-4 py-3 font-medium text-blue-400">
                      {s.statementNumber || s.id.slice(0, 8)}
                    </td>
                    <td data-label="Driver" className="px-4 py-3 text-gray-300">
                      {s.driver.firstName} {s.driver.lastName}
                    </td>
                    <td data-label="Period" className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(s.periodStart)} – {formatDate(s.periodEnd)}
                    </td>
                    <td data-label="Status" className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td data-label="Net" className="px-4 py-3 text-right font-medium text-gray-200">
                      {formatCurrency(s.netAmount)}
                    </td>
                    <td data-label="Loads" className="px-4 py-3 text-right text-gray-500">
                      {s._count?.lines ?? 0}
                    </td>
                    <td data-label="PDF" className="px-4 py-3 text-xs text-gray-500">
                      {s.pdfUrl ? 'Yes' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateSettlementModal
        isOpen={showCreate && canGenerate}
        onClose={() => setShowCreate(false)}
        onSuccess={(statementNumber, settlementId) => {
          void load();
          setToast({
            type: 'success',
            message: statementNumber
              ? `Statement ${statementNumber} created`
              : 'Settlement created',
          });
          if (settlementId) setDetailId(settlementId);
        }}
      />

      <SettlementDetailModal
        settlementId={detailId}
        onClose={() => setDetailId(null)}
        onUpdated={() => void load()}
      />

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
