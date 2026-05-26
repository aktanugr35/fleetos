'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Toast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock, LoadingCard } from '@/components/ui/LoadingBlock';
import { formatCurrency } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api-errors';
import { logErrorDev } from '@/lib/logger';
import type { DashboardLoadRow, DashboardSummary, RevenueChartPoint } from '@/lib/dashboard-types';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; class: string }> = {
    PENDING: { label: 'Pending', class: 'badge-yellow' },
    IN_TRANSIT: { label: 'In Transit', class: 'bg-blue-500/15 text-blue-400 border border-blue-500/30' },
    DELIVERED: { label: 'Delivered', class: 'badge-green' },
    CANCELLED: { label: 'Cancelled', class: 'badge-red' },
  };
  const c = config[status] || config.PENDING;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.class}`}>
      {c.label}
    </span>
  );
}

interface ComplianceSummary {
  expired: number;
  warning: number;
  valid: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const userRole = useAuthStore((s) => s.user?.role);

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [compliance, setCompliance] = useState<ComplianceSummary>({ expired: 0, warning: 0, valid: 0 });
  const [chartData, setChartData] = useState<RevenueChartPoint[]>([]);
  const [recentLoads, setRecentLoads] = useState<DashboardLoadRow[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (userRole === 'DRIVER') {
      router.replace('/dashboard/loads');
    }
  }, [userRole, router]);

  const fetchDashboardData = async () => {
    if (!userRole || userRole === 'DRIVER') return;
    try {
      setLoading(true);
      setFetchError(null);
      const [summaryRes, chartRes, loadsRes, complianceRes] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get('/reports/revenue-chart?months=6'),
        api.get('/loads?limit=5'),
        api.get('/compliance/overview'),
      ]);
      setSummary(summaryRes.data.data);
      setChartData(chartRes.data.data);
      setRecentLoads(loadsRes.data.data || []);
      const s = complianceRes.data.data.summary;
      setCompliance({ expired: s.expired, warning: s.warning, valid: s.valid });
    } catch (err) {
      logErrorDev('dashboard', err);
      const message = getApiErrorMessage(err, 'Failed to load dashboard');
      setFetchError(message);
      setToast({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userRole) return;
    if (userRole === 'DRIVER') return;
    void fetchDashboardData();
  }, [userRole]);

  if (userRole == null) {
    return (
      <div className="space-y-4">
        <PageHeader title="Dashboard" description="Overview of your fleet operations" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </div>
        <LoadingBlock rows={6} />
      </div>
    );
  }

  if (userRole === 'DRIVER') {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Dashboard" description="Overview of your fleet operations" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LoadingCard className="h-48" />
          <LoadingCard className="h-48" />
        </div>
        <LoadingBlock rows={6} />
      </div>
    );
  }

  if (fetchError && !summary) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Overview of your fleet operations" />
        <ErrorState message={fetchError} onRetry={() => void fetchDashboardData()} />
        {toast ? <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}
      </div>
    );
  }

  const loadsByStatus = summary?.operational?.loads || {};
  const activeLoadsCount = (loadsByStatus.PENDING || 0) + (loadsByStatus.IN_TRANSIT || 0);
  const maxRevenue = Math.max(...(chartData.length ? chartData.map((w) => w.revenue) : [1]));

  const stats = [
    { label: 'Monthly Revenue', value: summary?.financial?.monthlyRevenue || 0, format: 'currency' as const, icon: '💰' },
    { label: 'Active Loads', value: activeLoadsCount, format: 'number' as const, icon: '📦' },
    { label: 'Active Drivers', value: summary?.operational?.activeDrivers || 0, format: 'number' as const, icon: '👤' },
    { label: 'Active Trucks', value: summary?.operational?.activeTrucks || 0, format: 'number' as const, icon: '🚛' },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your fleet operations" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, i) => (
          <div key={i} className="card group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <div className="text-2xl font-bold text-gray-100">
              {stat.format === 'currency' ? formatCurrency(stat.value) : stat.value}
            </div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="font-semibold text-gray-200 mb-4">Compliance Status</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-4 rounded-lg bg-red-500/5 border border-red-500/10">
              <div className="text-3xl font-bold text-red-400">{compliance.expired}</div>
              <div className="text-xs text-gray-500 mt-1">Expired</div>
              {compliance.expired > 0 && <div className="w-2 h-2 rounded-full bg-red-500 mx-auto mt-2 animate-pulse" />}
            </div>
            <div className="text-center p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
              <div className="text-3xl font-bold text-yellow-400">{compliance.warning}</div>
              <div className="text-xs text-gray-500 mt-1">Warning</div>
              <div className="w-2 h-2 rounded-full bg-yellow-500 mx-auto mt-2" />
            </div>
            <div className="text-center p-4 rounded-lg bg-green-500/5 border border-green-500/10">
              <div className="text-3xl font-bold text-green-400">{compliance.valid}</div>
              <div className="text-xs text-gray-500 mt-1">Valid</div>
              <div className="w-2 h-2 rounded-full bg-green-500 mx-auto mt-2" />
            </div>
          </div>
          <Link href="/dashboard/compliance" className="btn btn-secondary w-full mt-4 text-xs block text-center">
            View All Compliance Items →
          </Link>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-200 mb-4">Monthly Revenue</h3>
          {chartData.length === 0 ? (
            <EmptyState title="No revenue data yet" description="Delivered loads will appear here." className="py-8" />
          ) : (
            <div className="flex items-end gap-2 h-40">
              {chartData.map((data, i) => {
                const height = (data.revenue / maxRevenue) * 100;
                const isLast = i === chartData.length - 1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group/bar">
                    <div className="text-[10px] text-gray-500 opacity-0 group-hover/bar:opacity-100 transition">
                      {formatCurrency(data.revenue)}
                    </div>
                    <div
                      className={`w-full rounded-t-sm transition-all duration-300 group-hover/bar:opacity-80 ${
                        isLast ? 'bg-gradient-to-t from-blue-600 to-blue-400' : 'bg-gradient-to-t from-blue-600/40 to-blue-400/40'
                      }`}
                      style={{ height: `${Math.max(2, height)}%` }}
                    />
                    <div className="text-[10px] text-gray-600 truncate max-w-full px-1">{data.month}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-200">Recent Loads</h3>
            <Link href="/dashboard/loads" className="text-xs text-blue-400 hover:text-blue-300 transition">View all →</Link>
          </div>
          {recentLoads.length === 0 ? (
            <EmptyState title="No recent loads" description="Create a load to see it here." />
          ) : (
            <div className="overflow-x-auto sm:overflow-visible">
              <table className="data-table mobile-card-table">
                <thead>
                  <tr>
                    <th>Load #</th>
                    <th>Driver</th>
                    <th>Route</th>
                    <th>Status</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLoads.map((load) => (
                    <tr key={load.id}>
                      <td data-primary="true" className="font-medium text-blue-400">{load.loadNumber}</td>
                      <td data-label="Driver">{load.driver ? `${load.driver.firstName} ${load.driver.lastName}` : '—'}</td>
                      <td data-label="Route" className="text-gray-500 truncate max-w-[200px]">
                        {load.pickupCity}, {load.pickupState} → {load.deliveryCity}, {load.deliveryState}
                      </td>
                      <td data-label="Status"><StatusBadge status={load.status} /></td>
                      <td data-label="Amount" className="text-right font-medium">{formatCurrency(load.totalRevenueCents ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-200 mb-4">Quick Links</h3>
          <div className="space-y-2 text-sm">
            <Link href="/dashboard/loads" className="block text-blue-400 hover:text-blue-300">Create or manage loads</Link>
            <Link href="/dashboard/settlements" className="block text-blue-400 hover:text-blue-300">Generate settlement PDF</Link>
            <Link href="/dashboard/compliance" className="block text-blue-400 hover:text-blue-300">Review compliance</Link>
          </div>
        </div>
      </div>

      {toast ? <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
