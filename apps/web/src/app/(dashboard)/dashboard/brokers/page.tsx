'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { CreateBrokerModal } from '@/components/forms/CreateBrokerModal';
import { Toast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { SearchInput } from '@/components/ui/SearchInput';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import api from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';

interface Broker {
  id: string;
  name: string;
  mcNumber: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
}

export default function BrokersPage() {
  const { can } = usePermission();
  const manage = can('brokers:write');
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/brokers', {
        params: { search: search || undefined, limit: 200 },
      });
      setBrokers(res.data.data as Broker[]);
    } catch {
      setBrokers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [search]);

  const handleDeactivate = async () => {
    if (!deactivateId) return;
    try {
      await api.delete(`/brokers/${deactivateId}`);
      setToast({ type: 'success', message: 'Broker deactivated' });
      setDeactivateId(null);
      await load();
    } catch {
      setToast({ type: 'error', message: 'Could not deactivate broker' });
    }
  };

  return (
    <div>
      <PageHeader
        title="Brokers"
        description="Saved brokers — typing their MC number on a load fills in the details"
        actions={
          manage ? (
            <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
              Add Broker
            </button>
          ) : undefined
        }
      />

      <div className="card mb-4 p-4">
        <SearchInput
          wrapperClassName="max-w-sm"
          placeholder="Search by name or MC…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <LoadingBlock />
        ) : brokers.length === 0 ? (
          <EmptyState
            title={search ? 'No brokers match your search' : 'No brokers yet'}
            description={
              manage
                ? 'Add a broker the first time you book a load with them, then their MC number fills the rest in automatically.'
                : 'No brokers to display.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table mobile-card-table">
              <thead>
                <tr>
                  <th>Broker</th>
                  <th>MC #</th>
                  <th>Contact</th>
                  <th>Phone</th>
                  <th>Email</th>
                  {manage ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {brokers.map((b) => (
                  <tr key={b.id}>
                    <td data-label="Broker">{b.name}</td>
                    <td data-label="MC #" className="font-mono">MC {b.mcNumber}</td>
                    <td data-label="Contact">{b.contactName || '—'}</td>
                    <td data-label="Phone">{b.phone || '—'}</td>
                    <td data-label="Email">{b.email || '—'}</td>
                    {manage ? (
                      <td data-label="Actions" className="text-right space-x-2">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setEditId(b.id)}
                        >
                          Edit
                        </button>
                        {b.isActive ? (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => setDeactivateId(b.id)}
                          >
                            Deactivate
                          </button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateBrokerModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          setToast({ type: 'success', message: 'Broker added' });
          void load();
        }}
      />
      <CreateBrokerModal
        isOpen={Boolean(editId)}
        onClose={() => setEditId(null)}
        brokerId={editId}
        onSuccess={() => {
          setToast({ type: 'success', message: 'Broker updated' });
          setEditId(null);
          void load();
        }}
      />
      <ConfirmDialog
        open={Boolean(deactivateId)}
        title="Deactivate broker?"
        message="They will no longer be suggested when an MC number is typed on a load. Existing loads are kept."
        confirmLabel="Deactivate"
        variant="danger"
        onConfirm={() => void handleDeactivate()}
        onCancel={() => setDeactivateId(null)}
      />
      {toast ? (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}
    </div>
  );
}
