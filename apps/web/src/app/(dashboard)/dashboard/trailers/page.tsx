'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { CreateTrailerModal } from '@/components/forms/CreateTrailerModal';
import { Toast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { getApiErrorMessage } from '@/lib/api-errors';
import { logErrorDev } from '@/lib/logger';
import api from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';

interface Trailer {
  id: string;
  unitNumber: string;
  make: string | null;
  model: string | null;
  year: number | null;
  licensePlate: string;
  plateState: string;
  isActive: boolean;
  _count: { loads: number };
}

export default function TrailersPage() {
  const { can } = usePermission();
  const canManage = can('equipment:write');
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTrailerId, setEditingTrailerId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchTrailers = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await api.get('/trailers');
      setTrailers(res.data.data);
    } catch (err) {
      logErrorDev('trailers', err);
      setFetchError(getApiErrorMessage(err, 'Failed to load trailers'));
      setTrailers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrailers();
  }, []);

  return (
    <div>
      <PageHeader
        title="Trailers"
        description="Manage your fleet trailers"
        actions={
          canManage ? (
            <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add Trailer
            </button>
          ) : undefined
        }
      />

      {fetchError && !loading ? (
        <ErrorState message={fetchError} onRetry={() => void fetchTrailers()} className="mb-6" />
      ) : null}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-4">
            <LoadingBlock rows={8} />
          </div>
        ) : trailers.length === 0 ? (
          <EmptyState
            title="No trailers yet"
            description="Add a trailer to assign to loads."
            action={
              canManage ? (
                <button type="button" className="btn btn-primary text-sm" onClick={() => setShowCreate(true)}>
                  Add Trailer
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Unit #</th>
                  <th>Make / Model</th>
                  <th>Year</th>
                  <th>Plate</th>
                  <th>Loads</th>
                  <th className="w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trailers.map((trailer) => (
                  <tr key={trailer.id}>
                    <td className="font-medium text-blue-400">{trailer.unitNumber}</td>
                    <td className="text-gray-300">{trailer.make || '—'} {trailer.model || ''}</td>
                    <td className="text-gray-500">{trailer.year || '—'}</td>
                    <td>
                      <span className="text-sm">{trailer.licensePlate}</span>
                      <span className="text-xs text-gray-500 ml-1">({trailer.plateState})</span>
                    </td>
                    <td className="text-gray-400">{trailer._count.loads}</td>
                    <td className="text-right">
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => setEditingTrailerId(trailer.id)}
                          className="text-xs text-gray-500 hover:text-blue-400 transition"
                        >
                          Edit
                        </button>
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

      <CreateTrailerModal
        isOpen={canManage && (showCreate || Boolean(editingTrailerId))}
        trailerId={editingTrailerId}
        onClose={() => {
          setShowCreate(false);
          setEditingTrailerId(null);
        }}
        onSuccess={() => {
          fetchTrailers();
          setToast({
            type: 'success',
            message: editingTrailerId ? 'Trailer updated!' : 'Trailer created!',
          });
          setShowCreate(false);
          setEditingTrailerId(null);
        }}
      />

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
