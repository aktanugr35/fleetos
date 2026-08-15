'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { CreateBrokerModal } from '@/components/forms/CreateBrokerModal';
import { BrokerAgentModal, type BrokerAgent } from '@/components/forms/BrokerAgentModal';
import { LoadStatusBadge } from '@/components/loads/LoadStatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { Toast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api-errors';
import type { LoadStatus } from '@/lib/loads';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/api';

interface AgentStats extends BrokerAgent {
  loadCount: number;
  revenueCents: number;
}

interface BrokerSummary {
  broker: { id: string; name: string; mcNumber: string; isActive: boolean };
  agents: AgentStats[];
  unassigned: { loadCount: number; revenueCents: number };
  totals: { loadCount: number; revenueCents: number };
  recentLoads: {
    id: string;
    loadNumber: string;
    puNumber: string | null;
    status: LoadStatus;
    pickupDate: string;
    pickupLocation: string;
    deliveryLocation: string;
    agentName: string | null;
    driverName: string;
    revenueCents: number;
  }[];
}

function share(part: number, total: number): string {
  if (total <= 0) return '—';
  return `${Math.round((part / total) * 100)}%`;
}

export default function BrokerDetailPage() {
  const params = useParams();
  const brokerId = params.id as string;
  const { can } = usePermission();
  const manage = can('brokers:write');

  const [summary, setSummary] = useState<BrokerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditBroker, setShowEditBroker] = useState(false);
  const [agentModal, setAgentModal] = useState<{ open: boolean; agent: AgentStats | null }>({
    open: false,
    agent: null,
  });
  const [removeAgent, setRemoveAgent] = useState<AgentStats | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/brokers/${brokerId}/summary`);
      setSummary(res.data.data as BrokerSummary);
    } catch (err) {
      setToast({ type: 'error', message: getApiErrorMessage(err, 'Broker not found') });
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [brokerId]);

  useEffect(() => {
    if (brokerId) void fetchSummary();
  }, [brokerId, fetchSummary]);

  const handleRemoveAgent = async () => {
    if (!removeAgent) return;
    try {
      const res = await api.delete(`/brokers/${brokerId}/agents/${removeAgent.id}`);
      setToast({ type: 'success', message: res.data.data?.message || 'Agent removed' });
      setRemoveAgent(null);
      await fetchSummary();
    } catch (err) {
      setToast({ type: 'error', message: getApiErrorMessage(err, 'Could not remove agent') });
    }
  };

  if (loading) {
    return <LoadingBlock />;
  }

  if (!summary) {
    return (
      <div>
        <PageHeader title="Broker" description="Not found" />
        <div className="card text-center py-12 text-gray-500">
          <p className="mb-4">This broker could not be loaded.</p>
          <Link href="/dashboard/brokers" className="btn btn-secondary text-sm">
            Back to Brokers
          </Link>
        </div>
        {toast ? <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}
      </div>
    );
  }

  const { broker, agents, unassigned, totals, recentLoads } = summary;

  return (
    <div>
      <PageHeader
        title={broker.name}
        description={`MC ${broker.mcNumber}${broker.isActive ? '' : ' · Inactive'}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/brokers" className="btn btn-secondary text-sm">
              ← Brokers
            </Link>
            {manage ? (
              <>
                <button
                  type="button"
                  className="btn btn-secondary text-sm"
                  onClick={() => setShowEditBroker(true)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-primary text-sm"
                  onClick={() => setAgentModal({ open: true, agent: null })}
                >
                  Add Agent
                </button>
              </>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Loads booked</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{totals.loadCount}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Total revenue</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
            {formatCurrency(totals.revenueCents)}
          </p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Agents</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{agents.length}</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-[var(--border-color)]">
          <h3 className="font-semibold text-[var(--text-primary)]">Business by agent</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Every load booked with this broker, credited to the agent it came from. Cancelled loads
            are left out.
          </p>
        </div>
        {agents.length === 0 && unassigned.loadCount === 0 ? (
          <EmptyState
            title="No agents yet"
            description={
              manage
                ? 'Add the people you book with here, then pick one on the load form to track how much each of them sends you.'
                : 'No agents saved for this broker.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table mobile-card-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Contact</th>
                  <th className="text-right">Loads</th>
                  <th className="text-right">Revenue</th>
                  <th className="text-right">Share</th>
                  {manage ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id}>
                    <td data-label="Agent">
                      <span className="font-medium text-[var(--text-primary)]">{agent.name}</span>
                      {!agent.isActive ? (
                        <span className="ml-2 text-xs text-[var(--text-muted)]">Inactive</span>
                      ) : null}
                    </td>
                    <td data-label="Contact" className="text-[var(--text-muted)]">
                      {agent.email || agent.phone || '—'}
                    </td>
                    <td data-label="Loads" className="text-right tabular-nums">{agent.loadCount}</td>
                    <td data-label="Revenue" className="text-right tabular-nums font-medium">
                      {formatCurrency(agent.revenueCents)}
                    </td>
                    <td data-label="Share" className="text-right tabular-nums text-[var(--text-muted)]">
                      {share(agent.revenueCents, totals.revenueCents)}
                    </td>
                    {manage ? (
                      <td data-label="Actions" className="text-right space-x-2">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setAgentModal({ open: true, agent })}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setRemoveAgent(agent)}
                        >
                          Remove
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
                {unassigned.loadCount > 0 ? (
                  <tr>
                    <td data-label="Agent" className="text-[var(--text-muted)] italic">No agent</td>
                    <td data-label="Contact" className="text-[var(--text-muted)]">—</td>
                    <td data-label="Loads" className="text-right tabular-nums">{unassigned.loadCount}</td>
                    <td data-label="Revenue" className="text-right tabular-nums">
                      {formatCurrency(unassigned.revenueCents)}
                    </td>
                    <td data-label="Share" className="text-right tabular-nums text-[var(--text-muted)]">
                      {share(unassigned.revenueCents, totals.revenueCents)}
                    </td>
                    {manage ? <td /> : null}
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-color)]">
          <h3 className="font-semibold text-[var(--text-primary)]">Recent loads</h3>
        </div>
        {recentLoads.length === 0 ? (
          <EmptyState
            title="No loads yet"
            description="Loads get linked here once you enter this broker's MC number on the load form."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table mobile-card-table">
              <thead>
                <tr>
                  <th>Load</th>
                  <th>PU #</th>
                  <th>Pickup</th>
                  <th>Route</th>
                  <th>Agent</th>
                  <th>Driver</th>
                  <th className="text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {recentLoads.map((load) => (
                  <tr key={load.id}>
                    <td data-label="Load">
                      <span className="font-medium text-[var(--text-primary)]">{load.loadNumber}</span>
                      <div className="mt-1">
                        <LoadStatusBadge status={load.status} />
                      </div>
                    </td>
                    <td data-label="PU #" className="font-mono text-[var(--text-muted)]">
                      {load.puNumber || '—'}
                    </td>
                    <td data-label="Pickup">{formatDate(load.pickupDate)}</td>
                    <td data-label="Route" className="text-[var(--text-muted)]">
                      {load.pickupLocation} → {load.deliveryLocation}
                    </td>
                    <td data-label="Agent">{load.agentName || '—'}</td>
                    <td data-label="Driver">{load.driverName}</td>
                    <td data-label="Revenue" className="text-right tabular-nums font-medium">
                      {formatCurrency(load.revenueCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateBrokerModal
        isOpen={manage && showEditBroker}
        brokerId={brokerId}
        onClose={() => setShowEditBroker(false)}
        onSuccess={() => {
          setToast({ type: 'success', message: 'Broker updated' });
          void fetchSummary();
        }}
      />
      <BrokerAgentModal
        isOpen={manage && agentModal.open}
        brokerId={brokerId}
        agent={agentModal.agent}
        onClose={() => setAgentModal({ open: false, agent: null })}
        onSuccess={() => {
          setToast({ type: 'success', message: 'Agent saved' });
          void fetchSummary();
        }}
      />
      <ConfirmDialog
        open={Boolean(removeAgent)}
        title="Remove agent?"
        message={
          removeAgent && removeAgent.loadCount > 0
            ? `${removeAgent.name} has ${removeAgent.loadCount} load(s), so they stay on those loads and are only hidden from new ones.`
            : 'This agent will be deleted.'
        }
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => void handleRemoveAgent()}
        onCancel={() => setRemoveAgent(null)}
      />
      {toast ? <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
