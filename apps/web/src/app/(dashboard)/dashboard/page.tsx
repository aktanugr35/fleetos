'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Toast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock, LoadingCard } from '@/components/ui/LoadingBlock';
import {
  IconChevronRight,
  IconDrivers,
  IconLoads,
  IconRevenue,
  IconTrucks,
} from '@/components/dashboard/DashboardIcons';
import { StateHeatMap } from '@/components/dashboard/StateHeatMap';
import { formatCurrency } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api-errors';
import { logErrorDev } from '@/lib/logger';
import type {
  DashboardLoadRow,
  DashboardSummary,
  HeatmapGranularity,
  StateHeatmapResponse,
} from '@/lib/dashboard-types';
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

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  accentColor: string;
}

function StatCard({ label, value, icon, accentColor }: StatCardProps) {
  return (
    <div
      className="card dashboard-stat-card"
      style={{ '--stat-accent-color': accentColor, '--stat-accent': accentColor } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="dashboard-stat-icon">{icon}</div>
      </div>
      <div className="mt-4 text-2xl font-bold tracking-tight text-gray-100">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-page space-y-6">
      <PageHeader title="Dashboard" description="Overview of your fleet operations" />
      <LoadingCard className="h-24" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <LoadingCard key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LoadingCard className="h-56" />
        <LoadingCard className="h-56" />
      </div>
      <LoadingBlock rows={6} />
    </div>
  );
}

const QUICK_LINKS = [
  {
    href: '/dashboard/loads',
    label: 'Create or manage loads',
    description: 'Dispatch and track freight',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/settlements',
    label: 'Generate settlement PDF',
    description: 'Weekly driver statements',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/dashboard/compliance',
    label: 'Review compliance',
    description: 'DOT, insurance, registrations',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
] as const;

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const userRole = user?.role;

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [compliance, setCompliance] = useState<ComplianceSummary>({ expired: 0, warning: 0, valid: 0 });
  const [heatmap, setHeatmap] = useState<StateHeatmapResponse | null>(null);
  const [recentLoads, setRecentLoads] = useState<DashboardLoadRow[]>([]);
  const [heatmapGranularity, setHeatmapGranularity] = useState<HeatmapGranularity>('month');
  const [heatmapPeriod, setHeatmapPeriod] = useState<string>('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date()),
    [],
  );

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
      const heatmapParams = new URLSearchParams({ granularity: heatmapGranularity });
      if (heatmapPeriod) heatmapParams.set('period', heatmapPeriod);

      const [summaryRes, heatmapRes, loadsRes, complianceRes] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get(`/reports/state-heatmap?${heatmapParams.toString()}`),
        api.get('/loads?limit=5'),
        api.get('/compliance/overview'),
      ]);
      setSummary(summaryRes.data.data);
      setHeatmap(heatmapRes.data.data);
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
  }, [userRole, heatmapGranularity, heatmapPeriod]);

  if (userRole == null || loading) {
    return <DashboardSkeleton />;
  }

  if (userRole === 'DRIVER') {
    return null;
  }

  if (fetchError && !summary) {
    return (
      <div className="dashboard-page">
        <PageHeader title="Dashboard" description="Overview of your fleet operations" />
        <ErrorState message={fetchError} onRetry={() => void fetchDashboardData()} />
        {toast ? <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}
      </div>
    );
  }

  const loadsByStatus = summary?.operational?.loads || {};
  const activeLoadsCount = (loadsByStatus.PENDING || 0) + (loadsByStatus.IN_TRANSIT || 0);
  const complianceTotal = compliance.expired + compliance.warning + compliance.valid;
  const greetingName = user?.firstName?.trim() || 'there';

  const pipeline = [
    { key: 'PENDING', label: 'Pending', count: loadsByStatus.PENDING || 0, color: 'var(--status-yellow)' },
    { key: 'IN_TRANSIT', label: 'In transit', count: loadsByStatus.IN_TRANSIT || 0, color: 'var(--fleetos-primary)' },
    { key: 'DELIVERED', label: 'Delivered', count: loadsByStatus.DELIVERED || 0, color: 'var(--status-green)' },
  ];

  return (
    <div className="dashboard-page space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your fleet operations"
        actions={
          <Link href="/dashboard/loads" className="btn btn-primary text-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Load
          </Link>
        }
      />

      <div className="dashboard-hero flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-blue-400/90">Fleet overview</p>
          <h2 className="mt-1 text-lg font-semibold text-gray-100 sm:text-xl">
            Welcome back, {greetingName}
          </h2>
          <p className="mt-1 text-sm text-gray-500">{todayLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {pipeline.map((item) => (
            <div key={item.key} className="dashboard-pipeline-pill min-w-[6.5rem]">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{item.label}</span>
              <span className="text-lg font-bold text-gray-100" style={{ color: item.count > 0 ? item.color : undefined }}>
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Delivered this month"
          value={formatCurrency(summary?.financial?.monthlyRevenue || 0)}
          icon={<IconRevenue />}
          accentColor="var(--fleetos-primary)"
        />
        <StatCard
          label="Active loads"
          value={String(activeLoadsCount)}
          icon={<IconLoads />}
          accentColor="var(--fleetos-accent)"
        />
        <StatCard
          label="Active drivers"
          value={String(summary?.operational?.activeDrivers || 0)}
          icon={<IconDrivers />}
          accentColor="var(--fleetos-secondary)"
        />
        <StatCard
          label="Active trucks"
          value={String(summary?.operational?.activeTrucks || 0)}
          icon={<IconTrucks />}
          accentColor="#38bdf8"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="dashboard-section-title">Pickup state heat map</h3>
            <span className="text-xs text-gray-500">Composite: loads + revenue + wait</span>
          </div>
          <StateHeatMap
            data={heatmap}
            granularity={heatmapGranularity}
            onGranularityChange={(value) => {
              setHeatmapGranularity(value);
              setHeatmapPeriod('');
            }}
            onPeriodChange={setHeatmapPeriod}
          />
        </div>

        <div className="card dashboard-compliance-compact">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="dashboard-section-title">Compliance</h3>
            <Link href="/dashboard/compliance" className="text-xs font-medium text-blue-400 hover:text-blue-300 transition">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Expired', count: compliance.expired, color: 'var(--status-red)', width: complianceTotal ? (compliance.expired / complianceTotal) * 100 : 0 },
              { label: 'Warning', count: compliance.warning, color: 'var(--status-yellow)', width: complianceTotal ? (compliance.warning / complianceTotal) * 100 : 0 },
              { label: 'Valid', count: compliance.valid, color: 'var(--status-green)', width: complianceTotal ? (compliance.valid / complianceTotal) * 100 : 0 },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-gray-400">{row.label}</span>
                  <span className="font-semibold text-gray-200">{row.count}</span>
                </div>
                <div className="dashboard-compliance-bar">
                  <span style={{ width: `${row.width}%`, background: row.color }} />
                </div>
              </div>
            ))}
          </div>
          {compliance.expired > 0 ? (
            <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">
              {compliance.expired} item{compliance.expired === 1 ? '' : 's'} need immediate action.
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="dashboard-section-title">Recent loads</h3>
            <Link href="/dashboard/loads" className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 transition">
              View all
              <IconChevronRight className="w-3.5 h-3.5" />
            </Link>
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
                    <tr key={load.id} className="hover:bg-white/[0.02]">
                      <td data-primary="true" className="font-medium text-blue-400">{load.loadNumber}</td>
                      <td data-label="Driver" className="text-gray-300">
                        {load.driver ? `${load.driver.firstName} ${load.driver.lastName}` : '—'}
                      </td>
                      <td data-label="Route" className="max-w-[200px] truncate text-gray-500">
                        {load.pickupCity}, {load.pickupState} → {load.deliveryCity}, {load.deliveryState}
                      </td>
                      <td data-label="Status"><StatusBadge status={load.status} /></td>
                      <td data-label="Amount" className="text-right font-semibold text-gray-200">
                        {formatCurrency(load.totalRevenueCents ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="dashboard-section-title mb-4">Quick actions</h3>
          <div className="space-y-2">
            {QUICK_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="dashboard-quick-link group">
                <span className="dashboard-quick-link-icon">{link.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-gray-200">{link.label}</span>
                  <span className="block text-xs text-gray-500">{link.description}</span>
                </span>
                <IconChevronRight className="w-4 h-4 shrink-0 text-gray-600 transition group-hover:text-blue-400" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {toast ? <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
