'use client';

import { useCallback, useEffect, useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { downloadSettlementPdf } from '@/lib/settlements';
import api from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import { SettlementStatus, type SettlementSummary } from '@haulyard/shared-types';

export type { SettlementSummary };

interface SettlementDetailModalProps {
  settlementId: string | null;
  onClose: () => void;
  onUpdated: () => void;
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

export function SettlementDetailModal({ settlementId, onClose, onUpdated }: SettlementDetailModalProps) {
  const { can } = usePermission();
  const canWrite = can('settlements:create');
  const canFinalize = can('settlements:finalize');

  const [settlement, setSettlement] = useState<SettlementSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!settlementId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/settlements/${settlementId}`);
      setSettlement(res.data.data as SettlementSummary);
    } catch {
      setSettlement(null);
      setError('Could not load settlement');
    } finally {
      setLoading(false);
    }
  }, [settlementId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (key: string, fn: () => Promise<void>) => {
    setActionLoading(key);
    setError('');
    try {
      await fn();
      await load();
      onUpdated();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Action failed';
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFinalize = () =>
    runAction('finalize', async () => {
      await api.patch(`/settlements/${settlementId}/approve`);
    });

  const handleMarkPaid = () =>
    runAction('paid', async () => {
      await api.patch(`/settlements/${settlementId}/paid`);
    });

  const handleGeneratePdf = () =>
    runAction('pdf', async () => {
      await api.post(`/settlements/${settlementId}/pdf`);
    });

  const handleDownloadPdf = () =>
    runAction('download', async () => {
      if (!settlement) return;
      await downloadSettlementPdf(settlement.id, settlement.statementNumber || settlement.id);
    });

  return (
    <Modal
      isOpen={Boolean(settlementId)}
      onClose={onClose}
      title={settlement?.statementNumber ? `Statement ${settlement.statementNumber}` : 'Settlement'}
      description={
        settlement
          ? `${settlement.driver.firstName} ${settlement.driver.lastName} · ${formatDate(settlement.periodStart)} – ${formatDate(settlement.periodEnd)}`
          : undefined
      }
      size="lg"
    >
      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : settlement ? (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <StatusBadge status={settlement.status} />
            {settlement.pdfUrl ? (
              <span className="text-xs text-gray-500">PDF on file</span>
            ) : (
              <span className="text-xs text-amber-500">No PDF yet</span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-[var(--border-color)] p-3">
              <p className="text-[10px] uppercase text-gray-500">Gross</p>
              <p className="text-sm font-semibold text-gray-100">{formatCurrency(settlement.grossAmount)}</p>
            </div>
            <div className="rounded-lg border border-[var(--border-color)] p-3">
              <p className="text-[10px] uppercase text-gray-500">Deductions</p>
              <p className="text-sm font-semibold text-red-400">-{formatCurrency(settlement.deductionTotal)}</p>
            </div>
            <div className="rounded-lg border border-[var(--border-color)] p-3">
              <p className="text-[10px] uppercase text-gray-500">Credits</p>
              <p className="text-sm font-semibold text-green-400">+{formatCurrency(settlement.creditTotal)}</p>
            </div>
            <div className="rounded-lg border border-[var(--border-color)] p-3">
              <p className="text-[10px] uppercase text-gray-500">Net payout</p>
              <p className="text-sm font-bold text-green-400">{formatCurrency(settlement.netAmount)}</p>
            </div>
          </div>

          {settlement.lines && settlement.lines.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Loads ({settlement.lines.length})</h4>
              <div className="max-h-32 overflow-y-auto rounded-lg border border-[var(--border-color)] divide-y divide-[var(--border-color)]">
                {settlement.lines.map((line) => (
                  <div key={line.id} className="px-3 py-2 flex justify-between text-sm">
                    <span className="text-gray-400 truncate pr-2">{line.description}</span>
                    <span className="text-gray-200 shrink-0">{formatCurrency(line.netAmount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500 py-8 text-center">Settlement not found</p>
      )}

      <ModalFooter>
        <button type="button" onClick={onClose} className="btn btn-secondary">
          Close
        </button>
        {settlement && (canWrite || canFinalize) ? (
          <>
            {canWrite ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={Boolean(actionLoading)}
                onClick={() => void handleGeneratePdf()}
              >
                {actionLoading === 'pdf' ? 'Generating…' : 'Generate PDF'}
              </button>
            ) : null}
            {settlement.pdfUrl ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={Boolean(actionLoading)}
                onClick={() => void handleDownloadPdf()}
              >
                Download PDF
              </button>
            ) : null}
            {canFinalize && settlement.status === SettlementStatus.DRAFT ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={Boolean(actionLoading)}
                onClick={() => void handleFinalize()}
              >
                {actionLoading === 'finalize' ? 'Finalizing…' : 'Finalize'}
              </button>
            ) : null}
            {canFinalize && settlement.status === SettlementStatus.FINALIZED ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={Boolean(actionLoading)}
                onClick={() => void handleMarkPaid()}
              >
                {actionLoading === 'paid' ? 'Saving…' : 'Mark paid'}
              </button>
            ) : null}
          </>
        ) : null}
      </ModalFooter>
    </Modal>
  );
}
