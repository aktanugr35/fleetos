'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { CreateDispatcherModal } from '@/components/forms/CreateDispatcherModal';
import { Toast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { SearchInput } from '@/components/ui/SearchInput';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import api from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';

interface Dispatcher {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  commissionRate: number;
  isActive: boolean;
  _count: { bookedLoads: number; dispatcherSettlements: number };
}

export default function DispatchersPage() {
  const { can } = usePermission();
  const manage = can('dispatchers:write');
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dispatchers', { params: { search: search || undefined, limit: 100 } });
      setDispatchers(res.data.data as Dispatcher[]);
    } catch {
      setDispatchers([]);
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
      await api.delete(`/dispatchers/${deactivateId}`);
      setToast({ type: 'success', message: 'Dispatcher deactivated' });
      setDeactivateId(null);
      await load();
    } catch {
      setToast({ type: 'error', message: 'Could not deactivate dispatcher' });
    }
  };

  return (
    <div>
      <PageHeader
        title="Dispatchers"
        description="Dispatcher profiles and commission rates for booked loads"
        actions={
          manage ? (
            <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
              Add Dispatcher
            </button>
          ) : undefined
        }
      />

      <div className="card mb-4 p-4">
        <SearchInput
          wrapperClassName="max-w-sm"
          placeholder="Search dispatchers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <LoadingBlock />
        ) : dispatchers.length === 0 ? (
          <EmptyState
            title="No dispatchers yet"
            description={manage ? 'Add dispatcher profiles before assigning booked loads.' : 'No dispatchers to display.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Commission</th>
                  <th>Contact</th>
                  <th>Booked Loads</th>
                  <th>Statements</th>
                  {manage ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {dispatchers.map((d) => (
                  <tr key={d.id}>
                    <td data-label="Name">{d.firstName} {d.lastName}</td>
                    <td data-label="Commission">{(d.commissionRate / 100).toFixed(2)}%</td>
                    <td data-label="Contact">{d.email || d.phone || '—'}</td>
                    <td data-label="Booked Loads">{d._count.bookedLoads}</td>
                    <td data-label="Statements">{d._count.dispatcherSettlements}</td>
                    {manage ? (
                      <td data-label="Actions" className="text-right space-x-2">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditId(d.id)}>
                          Edit
                        </button>
                        {d.isActive ? (
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeactivateId(d.id)}>
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

      <CreateDispatcherModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          setToast({ type: 'success', message: 'Dispatcher added' });
          void load();
        }}
      />
      <CreateDispatcherModal
        isOpen={Boolean(editId)}
        onClose={() => setEditId(null)}
        dispatcherId={editId}
        onSuccess={() => {
          setToast({ type: 'success', message: 'Dispatcher updated' });
          setEditId(null);
          void load();
        }}
      />
      <ConfirmDialog
        open={Boolean(deactivateId)}
        title="Deactivate dispatcher?"
        message="They will no longer appear in Booked By selectors. Existing loads are kept."
        confirmLabel="Deactivate"
        variant="danger"
        onConfirm={() => void handleDeactivate()}
        onCancel={() => setDeactivateId(null)}
      />
      {toast ? <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
