'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatCurrency } from '@/lib/utils';
import { CreditRecord } from '@/lib/credits';
import api from '@/lib/api';
import { SearchInput } from '@/components/ui/SearchInput';

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  driverType: string;
  isActive: boolean;
  truck: { unitNumber: string } | null;
}

interface DriverSummary {
  driver: Driver;
  totalCount: number;
  totalAmount: number;
}

export default function CreditsPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [credits, setCredits] = useState<CreditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [driversRes, creditsRes] = await Promise.all([
          api.get('/drivers'),
          api.get('/credits?limit=500'),
        ]);
        setDrivers(driversRes.data.data);
        setCredits(creditsRes.data.data);
      } catch {
        setDrivers([]);
        setCredits([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const summaries = useMemo(() => {
    const byDriver = new Map<string, DriverSummary>();

    for (const driver of drivers.filter((d) => d.isActive)) {
      byDriver.set(driver.id, {
        driver,
        totalCount: 0,
        totalAmount: 0,
      });
    }

    for (const c of credits) {
      const entry = byDriver.get(c.driver.id);
      if (!entry) continue;
      entry.totalCount += 1;
      entry.totalAmount += c.amount;
    }

    return Array.from(byDriver.values()).sort((a, b) =>
      a.driver.firstName.localeCompare(b.driver.firstName)
    );
  }, [drivers, credits]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return summaries;
    return summaries.filter(({ driver }) => {
      const name = `${driver.firstName} ${driver.lastName}`.toLowerCase();
      const truck = driver.truck?.unitNumber?.toLowerCase() || '';
      return name.includes(q) || truck.includes(q);
    });
  }, [summaries, search]);

  const fleetTotal = summaries.reduce((sum, s) => sum + s.totalAmount, 0);
  const fleetCount = summaries.reduce((sum, s) => sum + s.totalCount, 0);

  return (
    <div>
      <PageHeader
        title="Credits"
        description="Select a driver to view credits by statement period date"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Active Drivers</p>
          <p className="text-2xl font-bold text-gray-100 mt-1">{summaries.length}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Credits</p>
          <p className="text-2xl font-bold text-gray-100 mt-1">{fleetCount}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Amount</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{formatCurrency(fleetTotal)}</p>
        </div>
      </div>

      <SearchInput
        wrapperClassName="max-w-sm mb-6"
        placeholder="Search drivers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center h-48 text-gray-500">
          <p className="text-sm">No drivers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(({ driver, totalCount, totalAmount }) => (
            <Link
              key={driver.id}
              href={`/dashboard/credits/${driver.id}`}
              className="card group hover:border-green-500/30 hover:bg-green-500/[0.03] transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-100 group-hover:text-green-400 transition truncate">
                    {driver.firstName} {driver.lastName}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {driver.driverType === 'OWNER_OPERATOR' ? 'Owner Operator' : 'Company Driver'}
                    {driver.truck ? ` · Truck ${driver.truck.unitNumber}` : ''}
                  </p>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-gray-600 group-hover:text-green-400 flex-shrink-0 transition"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--border-color)] grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Records</p>
                  <p className="text-sm font-semibold text-gray-200 mt-0.5">{totalCount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Total</p>
                  <p className="text-sm font-semibold text-green-400 mt-0.5">{formatCurrency(totalAmount)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
