'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatDate } from '@/lib/utils';
import { CreateTruckModal } from '@/components/forms/CreateTruckModal';
import { Toast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { getApiErrorMessage } from '@/lib/api-errors';
import { logErrorDev } from '@/lib/logger';
import api from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';

interface Truck {
  id: string;
  unitNumber: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  licensePlate: string;
  plateState: string;
  dotInspectionExpiry: string;
  irpExpiry: string;
  hvutExpiry: string;
  insuranceExpiry: string;
  isActive: boolean;
  ownerDriver: { id: string; firstName: string; lastName: string } | null;
  _count: { loads: number };
}

function ComplianceDot({ date }: { date: string }) {
  const now = new Date();
  const expiry = new Date(date);
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  let color = 'bg-green-500';
  if (expiry < now) color = 'bg-red-500 animate-pulse';
  else if (expiry <= thirtyDays) color = 'bg-yellow-500';
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} title={formatDate(date)} />;
}

export default function TrucksPage() {
  const { can } = usePermission();
  const canManage = can('equipment:write');
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTruckId, setEditingTruckId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchTrucks = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await api.get('/trucks');
      setTrucks(res.data.data);
    } catch (err) {
      logErrorDev('trucks', err);
      setFetchError(getApiErrorMessage(err, 'Failed to load trucks'));
      setTrucks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrucks();
  }, []);

  return (
    <div>
      <PageHeader
        title="Trucks"
        description="Manage your fleet vehicles"
        actions={
          canManage ? (
            <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add Truck
            </button>
          ) : undefined
        }
      />

      {fetchError && !loading ? (
        <ErrorState message={fetchError} onRetry={() => void fetchTrucks()} className="mb-6" />
      ) : null}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-4">
            <LoadingBlock rows={8} />
          </div>
        ) : trucks.length === 0 ? (
          <EmptyState
            title="No trucks yet"
            description="Add a truck to track compliance and loads."
            action={
              canManage ? (
                <button type="button" className="btn btn-primary text-sm" onClick={() => setShowCreate(true)}>
                  Add Truck
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto sm:overflow-visible">
            <table className="data-table mobile-card-table">
              <thead>
                <tr>
                  <th>Unit #</th>
                  <th>Vehicle</th>
                  <th>VIN</th>
                  <th>Plate</th>
                  <th>Owner</th>
                  <th>Compliance</th>
                  <th>Loads</th>
                  <th className="w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trucks.map((truck) => (
                  <tr key={truck.id} className="cursor-pointer">
                    <td data-primary="true" className="font-medium text-blue-400">{truck.unitNumber}</td>
                    <td data-label="Vehicle">
                      <p className="text-gray-200">{truck.make} {truck.model}</p>
                      <p className="text-xs text-gray-500">{truck.year}</p>
                    </td>
                    <td data-label="VIN" className="text-xs text-gray-500 font-mono">{truck.vin}</td>
                    <td data-label="Plate">
                      <p className="text-sm">{truck.licensePlate}</p>
                      <p className="text-xs text-gray-500">{truck.plateState}</p>
                    </td>
                    <td data-label="Owner">
                      {truck.ownerDriver ? (
                        <span className="text-sm">{truck.ownerDriver.firstName} {truck.ownerDriver.lastName}</span>
                      ) : (
                        <span className="text-xs text-gray-500 bg-blue-500/10 px-2 py-0.5 rounded">Company</span>
                      )}
                    </td>
                    <td data-label="Compliance">
                      <div className="flex items-center gap-1.5" title="DOT · IRP · HVUT · Insurance">
                        <ComplianceDot date={truck.dotInspectionExpiry} />
                        <ComplianceDot date={truck.irpExpiry} />
                        <ComplianceDot date={truck.hvutExpiry} />
                        <ComplianceDot date={truck.insuranceExpiry} />
                      </div>
                    </td>
                    <td data-label="Loads" className="text-gray-400">{truck._count.loads}</td>
                    <td data-actions="true" className="text-right">
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => setEditingTruckId(truck.id)}
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

      <CreateTruckModal
        isOpen={canManage && (showCreate || Boolean(editingTruckId))}
        truckId={editingTruckId}
        onClose={() => {
          setShowCreate(false);
          setEditingTruckId(null);
        }}
        onSuccess={() => {
          fetchTrucks();
          setToast({
            type: 'success',
            message: editingTruckId ? 'Truck updated!' : 'Truck created successfully!',
          });
          setShowCreate(false);
          setEditingTruckId(null);
        }}
      />

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
