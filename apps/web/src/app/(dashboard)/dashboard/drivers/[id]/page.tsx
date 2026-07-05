'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { CreateDriverModal } from '@/components/forms/CreateDriverModal';
import { Toast } from '@/components/ui/Toast';
import { formatCurrency, formatDate, formatDateTimeAmPm } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api-errors';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/api';

interface DriverDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  driverType: string;
  payStructure: string;
  payRate: number;
  cdlNumber: string;
  cdlState: string;
  cdlExpiryDate: string;
  medicalCardExpiry: string;
  escrowBalance: number;
  isActive: boolean;
  truck: { id: string; unitNumber: string; make: string; model: string } | null;
  _count: { loads: number; settlements: number; deductions: number };
}

interface LoadRow {
  id: string;
  loadNumber: string;
  status: string;
  pickupCity: string;
  pickupState: string;
  deliveryCity: string;
  deliveryState: string;
  pickupDate: string;
  totalRevenueCents: number;
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

export default function DriverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const driverId = params.id as string;
  const { can } = usePermission();
  const manageDrivers = can('drivers:write');

  const [driver, setDriver] = useState<DriverDetail | null>(null);
  const [loads, setLoads] = useState<LoadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchDriver = async () => {
    try {
      setLoading(true);
      const [driverRes, loadsRes] = await Promise.all([
        api.get(`/drivers/${driverId}`),
        api.get(`/loads?driverId=${driverId}&limit=10`),
      ]);
      setDriver(driverRes.data.data);
      setLoads(loadsRes.data.data || []);
    } catch (err) {
      setToast({ type: 'error', message: getApiErrorMessage(err, 'Driver not found') });
      setDriver(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (driverId) void fetchDriver();
  }, [driverId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div>
        <PageHeader title="Driver" description="Not found" />
        <div className="card text-center py-12 text-gray-500">
          <p className="mb-4">This driver could not be loaded.</p>
          <Link href="/dashboard/drivers" className="btn btn-secondary text-sm">Back to Drivers</Link>
        </div>
        {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      </div>
    );
  }

  const name = `${driver.firstName} ${driver.lastName}`;

  return (
    <div>
      <PageHeader
        title={name}
        description={driver.driverType === 'OWNER_OPERATOR' ? 'Owner Operator' : 'Company Driver'}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/drivers" className="btn btn-secondary text-sm">← Drivers</Link>
            {manageDrivers ? (
              <button type="button" className="btn btn-primary text-sm" onClick={() => setShowEdit(true)}>Edit</button>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-gray-200 mb-4">Contact & Pay</h3>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd className="text-gray-200">{driver.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Phone</dt>
              <dd className="text-gray-200">{driver.phone || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Pay structure</dt>
              <dd className="text-gray-200">{driver.payStructure.replace('_', ' ')}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Pay rate</dt>
              <dd className="text-gray-200">
                {driver.payStructure === 'PERCENTAGE'
                  ? `${(driver.payRate / 100).toFixed(0)}%`
                  : driver.payStructure === 'PER_MILE'
                    ? `$${(driver.payRate / 100).toFixed(2)}/mi`
                    : formatCurrency(driver.payRate)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Deposit (escrow)</dt>
              <dd className="text-gray-200">{formatCurrency(driver.escrowBalance ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Assigned truck</dt>
              <dd className="text-gray-200">
                {driver.truck ? (
                  <Link href="/dashboard/trucks" className="text-blue-400 hover:text-blue-300">
                    {driver.truck.unitNumber} — {driver.truck.make} {driver.truck.model}
                  </Link>
                ) : (
                  '—'
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-200 mb-4">Stats</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Loads</span>
              <span className="text-gray-200 font-medium">{driver._count.loads}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Settlements</span>
              <span className="text-gray-200 font-medium">{driver._count.settlements}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Deductions</span>
              <span className="text-gray-200 font-medium">{driver._count.deductions}</span>
            </div>
            <Link href={`/dashboard/deductions?driverId=${driver.id}`} className="text-xs text-blue-400 hover:text-blue-300 block pt-2">
              View deductions →
            </Link>
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <h3 className="font-semibold text-gray-200 mb-4">Compliance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-secondary)]">
            <ComplianceDot date={driver.cdlExpiryDate} />
            <div>
              <p className="text-gray-200 font-medium">CDL — {driver.cdlNumber}</p>
              <p className="text-gray-500 text-xs">{driver.cdlState} · Expires {formatDate(driver.cdlExpiryDate)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-secondary)]">
            <ComplianceDot date={driver.medicalCardExpiry} />
            <div>
              <p className="text-gray-200 font-medium">Medical card</p>
              <p className="text-gray-500 text-xs">Expires {formatDate(driver.medicalCardExpiry)}</p>
            </div>
          </div>
        </div>
        <Link href="/dashboard/compliance" className="text-xs text-blue-400 hover:text-blue-300 mt-4 inline-block">
          All compliance items →
        </Link>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="font-semibold text-gray-200">Recent Loads</h3>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/loads?driverId=${driver.id}`)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            View all →
          </button>
        </div>
        {loads.length === 0 ? (
          <p className="text-center py-8 text-gray-500 text-sm">No loads for this driver</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Load #</th>
                  <th>Route</th>
                  <th>Pickup</th>
                  <th>Status</th>
                  <th className="text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {loads.map((load) => (
                  <tr key={load.id}>
                    <td className="font-medium text-blue-400">{load.loadNumber}</td>
                    <td className="text-sm text-gray-400">
                      {load.pickupCity}, {load.pickupState} → {load.deliveryCity}, {load.deliveryState}
                    </td>
                    <td className="text-gray-500 text-sm">{formatDateTimeAmPm(load.pickupDate)}</td>
                    <td className="text-gray-400 text-xs">{load.status.replace('_', ' ')}</td>
                    <td className="text-right font-medium">{formatCurrency(load.totalRevenueCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateDriverModal
        isOpen={manageDrivers && showEdit}
        driverId={driverId}
        onClose={() => setShowEdit(false)}
        onSuccess={() => {
          setShowEdit(false);
          void fetchDriver();
          setToast({ type: 'success', message: 'Driver updated!' });
        }}
      />

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
