'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatDate } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { getApiErrorMessage } from '@/lib/api-errors';
import { logErrorDev } from '@/lib/logger';
import api from '@/lib/api';

interface ComplianceItem {
  id: string;
  entityType: 'DRIVER' | 'TRUCK';
  entityId: string;
  entityName: string;
  itemType: string;
  expiryDate: string;
  status: 'GREEN' | 'YELLOW' | 'RED';
  daysRemaining: number;
}

interface ComplianceSummary {
  total: number;
  expired: number;
  warning: number;
  valid: number;
}

function StatusBadge({ status, daysRemaining }: { status: string; daysRemaining: number }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    RED: { bg: 'bg-red-500/15 border-red-500/30', text: 'text-red-400', label: 'Expired' },
    YELLOW: { bg: 'bg-yellow-500/15 border-yellow-500/30', text: 'text-yellow-400', label: `${daysRemaining}d left` },
    GREEN: { bg: 'bg-green-500/15 border-green-500/30', text: 'text-green-400', label: 'Valid' },
  };
  const c = config[status] || config.GREEN;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text}`}>
      {status === 'RED' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-1.5" />}
      {c.label}
    </span>
  );
}

function EntityTypeBadge({ type }: { type: string }) {
  return (
    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded ${
      type === 'DRIVER' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
    }`}>
      {type}
    </span>
  );
}

export default function CompliancePage() {
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [summary, setSummary] = useState<ComplianceSummary>({ total: 0, expired: 0, warning: 0, valid: 0 });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const fetchCompliance = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await api.get('/compliance/overview');
      setItems(res.data.data.items);
      setSummary(res.data.data.summary);
    } catch (err) {
      logErrorDev('compliance', err);
      setFetchError(getApiErrorMessage(err, 'Failed to load compliance data'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCompliance();
  }, []);

  const filteredItems = filter === 'all' ? items : items.filter(i => i.status === filter);

  const entityHref = (item: ComplianceItem) => {
    if (item.entityType === 'DRIVER') return `/dashboard/drivers/${item.entityId}`;
    return '/dashboard/trucks';
  };

  return (
    <div>
      <PageHeader title="Compliance" description="DOT/FMCSA compliance tracking for all drivers and vehicles" />

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <button onClick={() => setFilter('all')} className={`card text-center transition ${filter === 'all' ? 'ring-2 ring-blue-500/50' : ''}`}>
          <div className="text-3xl font-bold text-gray-200">{summary.total}</div>
          <div className="text-xs text-gray-500 mt-1">Total Items</div>
        </button>
        <button onClick={() => setFilter('RED')} className={`card text-center transition ${filter === 'RED' ? 'ring-2 ring-red-500/50' : ''}`}>
          <div className="text-3xl font-bold text-red-400">{summary.expired}</div>
          <div className="text-xs text-gray-500 mt-1">Expired</div>
          {summary.expired > 0 && <div className="w-2 h-2 rounded-full bg-red-500 mx-auto mt-2 animate-pulse" />}
        </button>
        <button onClick={() => setFilter('YELLOW')} className={`card text-center transition ${filter === 'YELLOW' ? 'ring-2 ring-yellow-500/50' : ''}`}>
          <div className="text-3xl font-bold text-yellow-400">{summary.warning}</div>
          <div className="text-xs text-gray-500 mt-1">Warning (&lt;30 days)</div>
        </button>
        <button onClick={() => setFilter('GREEN')} className={`card text-center transition ${filter === 'GREEN' ? 'ring-2 ring-green-500/50' : ''}`}>
          <div className="text-3xl font-bold text-green-400">{summary.valid}</div>
          <div className="text-xs text-gray-500 mt-1">Valid</div>
        </button>
      </div>

      {fetchError && !loading ? (
        <ErrorState message={fetchError} onRetry={() => void fetchCompliance()} className="mb-6" />
      ) : null}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-4">
            <LoadingBlock rows={8} />
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="No compliance items"
            description={filter === 'all' ? 'All documents are up to date.' : `No items with ${filter.toLowerCase()} status.`}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Entity</th>
                  <th>Document</th>
                  <th>Expiry Date</th>
                  <th>Days Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className={item.status === 'RED' ? 'bg-red-500/[0.03]' : ''}>
                    <td><EntityTypeBadge type={item.entityType} /></td>
                    <td className="font-medium">
                      <Link href={entityHref(item)} className="text-blue-400 hover:text-blue-300">
                        {item.entityName}
                      </Link>
                    </td>
                    <td className="text-gray-400">{item.itemType}</td>
                    <td className="text-gray-400">{formatDate(item.expiryDate)}</td>
                    <td className={`font-medium ${
                      item.daysRemaining < 0 ? 'text-red-400' : item.daysRemaining <= 30 ? 'text-yellow-400' : 'text-gray-400'
                    }`}>
                      {item.daysRemaining < 0 ? `${Math.abs(item.daysRemaining)}d overdue` : `${item.daysRemaining}d`}
                    </td>
                    <td><StatusBadge status={item.status} daysRemaining={item.daysRemaining} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
