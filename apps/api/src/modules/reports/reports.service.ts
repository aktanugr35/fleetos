import { prisma } from '../../config/database';
import type { LoadStatus } from '@prisma/client';
import {
  currentMonthDeliveredGrossCents,
  grossLineCents,
  monthLabelFromKey,
  sumDeliveredGrossByDeliveryMonth,
} from './reports.revenue';

function milesForLoad(load: {
  totalMiles: number | null;
  loadedMiles: number | null;
  deadheadMiles: number | null;
}): number {
  if (load.totalMiles != null && load.totalMiles > 0) return load.totalMiles;
  return (load.loadedMiles ?? 0) + (load.deadheadMiles ?? 0);
}

function utcYmd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export interface OperationalAnalytics {
  range: { from: string; to: string };
  basis: string;
  company: {
    totalLoads: number;
    byStatus: Partial<Record<LoadStatus, number>>;
    deliveredLoads: number;
    grossRevenueDeliveredCents: number;
    totalMiles: number;
    loadedMiles: number;
    deadheadMiles: number;
    driversWithLoads: number;
    /** Sum of each driver's distinct pickup-calendar-days (UTC) */
    totalDriverWorkDays: number;
    /** Calendar days (UTC) in range with at least one pickup */
    fleetActiveCalendarDays: number;
  };
  revenueByMonth: { monthKey: string; label: string; revenueCents: number }[];
  drivers: {
    driverId: string;
    firstName: string;
    lastName: string;
    driverType: string;
    totalLoads: number;
    deliveredLoads: number;
    cancelledLoads: number;
    tonuLoads: number;
    pendingOrTransitLoads: number;
    workDays: number;
    totalMiles: number;
    loadedMiles: number;
    deadheadMiles: number;
    grossRevenueDeliveredCents: number;
  }[];
  brokers: {
    brokerName: string;
    totalLoads: number;
    deliveredLoads: number;
    grossRevenueDeliveredCents: number;
    totalMiles: number;
    loadedMiles: number;
    deadheadMiles: number;
  }[];
}

export class ReportsService {
  async getDashboardSummary(tenantId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const totalTrucks = await prisma.truck.count({ where: { companyId: tenantId, isActive: true } });
    const totalDrivers = await prisma.driver.count({ where: { companyId: tenantId, isActive: true } });

    const loadStats = await prisma.load.groupBy({
      by: ['status'],
      where: { companyId: tenantId },
      _count: { id: true },
    });

    const deliveredLoads = await prisma.load.findMany({
      where: {
        companyId: tenantId,
        status: 'DELIVERED',
        OR: [
          { actualDeliveryDate: { gte: monthStart, lt: nextMonthStart } },
          { deliveryDate: { gte: monthStart, lt: nextMonthStart } },
        ],
      },
      select: {
        rateTotal: true,
        detentionPay: true,
        lumperFee: true,
        fuelSurcharge: true,
        tonuAmount: true,
        deliveryDate: true,
        actualDeliveryDate: true,
      },
    });

    const monthlyRevenue = currentMonthDeliveredGrossCents(deliveredLoads, now);

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringDrivers = await prisma.driver.count({
      where: {
        companyId: tenantId,
        isActive: true,
        OR: [
          { cdlExpiryDate: { lte: thirtyDaysFromNow } },
          { medicalCardExpiry: { lte: thirtyDaysFromNow } },
        ],
      },
    });

    const expiringTrucks = await prisma.truck.count({
      where: {
        companyId: tenantId,
        isActive: true,
        OR: [
          { dotInspectionExpiry: { lte: thirtyDaysFromNow } },
          { insuranceExpiry: { lte: thirtyDaysFromNow } },
        ],
      },
    });

    return {
      operational: {
        activeTrucks: totalTrucks,
        activeDrivers: totalDrivers,
        loads: loadStats.reduce(
          (acc, curr) => ({ ...acc, [curr.status]: curr._count.id }),
          {} as Record<string, number>
        ),
        complianceWarnings: expiringDrivers + expiringTrucks,
      },
      financial: {
        monthlyRevenue,
      },
    };
  }

  async getRevenueChart(tenantId: string, months = 6) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const loads = await prisma.load.findMany({
      where: {
        companyId: tenantId,
        status: 'DELIVERED',
        OR: [{ deliveryDate: { gte: startDate } }, { actualDeliveryDate: { gte: startDate } }],
      },
      select: {
        deliveryDate: true,
        actualDeliveryDate: true,
        rateTotal: true,
        detentionPay: true,
        lumperFee: true,
        fuelSurcharge: true,
        tonuAmount: true,
      },
    });

    const grouped = sumDeliveredGrossByDeliveryMonth(loads, { from: startDate });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, revenue]) => ({
        month: monthLabelFromKey(key),
        revenue,
      }));
  }

  async getBrokerSummary(tenantId: string, limit = 12) {
    const rows = await prisma.load.groupBy({
      by: ['brokerName'],
      where: { companyId: tenantId, status: 'DELIVERED' },
      _count: { id: true },
      _sum: { rateTotal: true },
      orderBy: { _sum: { rateTotal: 'desc' } },
      take: limit,
    });

    return rows.map((r) => ({
      brokerName: r.brokerName,
      loadCount: r._count.id,
      revenueCents: r._sum.rateTotal || 0,
    }));
  }

  /**
   * Loads whose **pickupDate** falls in [from, to] (inclusive, UTC day bounds from caller).
   * Revenue and delivered counts use load **status**; miles sum over all matching loads.
   */
  async getOperationalAnalytics(
    tenantId: string,
    from: Date,
    to: Date
  ): Promise<OperationalAnalytics> {
    const loads = await prisma.load.findMany({
      where: {
        companyId: tenantId,
        pickupDate: { gte: from, lte: to },
      },
      select: {
        id: true,
        driverId: true,
        brokerName: true,
        status: true,
        pickupDate: true,
        rateTotal: true,
        detentionPay: true,
        lumperFee: true,
        fuelSurcharge: true,
        tonuAmount: true,
        loadedMiles: true,
        deadheadMiles: true,
        totalMiles: true,
        driver: { select: { firstName: true, lastName: true, driverType: true } },
      },
    });

    const byStatus: Partial<Record<LoadStatus, number>> = {};
    let deliveredLoads = 0;
    let grossRevenueDeliveredCents = 0;
    let companyTotalMiles = 0;
    let companyLoadedMiles = 0;
    let companyDeadheadMiles = 0;

    type DriverAgg = {
      firstName: string;
      lastName: string;
      driverType: string;
      totalLoads: number;
      deliveredLoads: number;
      cancelledLoads: number;
      tonuLoads: number;
      pendingOrTransitLoads: number;
      dayKeys: Set<string>;
      totalMiles: number;
      loadedMiles: number;
      deadheadMiles: number;
      grossRevenueDeliveredCents: number;
    };

    type BrokerAgg = {
      totalLoads: number;
      deliveredLoads: number;
      totalMiles: number;
      loadedMiles: number;
      deadheadMiles: number;
      grossRevenueDeliveredCents: number;
    };

    const driverMap = new Map<string, DriverAgg>();
    const brokerMap = new Map<string, BrokerAgg>();
    const revenueByMonth = new Map<string, number>();
    const fleetDayKeys = new Set<string>();

    for (const load of loads) {
      byStatus[load.status] = (byStatus[load.status] ?? 0) + 1;

      const miles = milesForLoad(load);
      const lm = load.loadedMiles ?? 0;
      const dh = load.deadheadMiles ?? 0;
      companyTotalMiles += miles;
      companyLoadedMiles += lm;
      companyDeadheadMiles += dh;

      const dayKey = utcYmd(load.pickupDate);
      fleetDayKeys.add(dayKey);

      if (load.status === 'DELIVERED') {
        deliveredLoads += 1;
        const cents = grossLineCents(load);
        grossRevenueDeliveredCents += cents;
        const ym = `${load.pickupDate.getUTCFullYear()}-${String(load.pickupDate.getUTCMonth() + 1).padStart(2, '0')}`;
        revenueByMonth.set(ym, (revenueByMonth.get(ym) ?? 0) + cents);
      }

      const dName = load.driver;
      const dFirst = dName?.firstName ?? '?';
      const dLast = dName?.lastName ?? '?';
      const dType = dName?.driverType ?? 'UNKNOWN';

      let dAgg = driverMap.get(load.driverId);
      if (!dAgg) {
        dAgg = {
          firstName: dFirst,
          lastName: dLast,
          driverType: dType,
          totalLoads: 0,
          deliveredLoads: 0,
          cancelledLoads: 0,
          tonuLoads: 0,
          pendingOrTransitLoads: 0,
          dayKeys: new Set(),
          totalMiles: 0,
          loadedMiles: 0,
          deadheadMiles: 0,
          grossRevenueDeliveredCents: 0,
        };
        driverMap.set(load.driverId, dAgg);
      }
      dAgg.totalLoads += 1;
      dAgg.dayKeys.add(dayKey);
      dAgg.totalMiles += miles;
      dAgg.loadedMiles += lm;
      dAgg.deadheadMiles += dh;
      if (load.status === 'DELIVERED') {
        dAgg.deliveredLoads += 1;
        dAgg.grossRevenueDeliveredCents += grossLineCents(load);
      } else if (load.status === 'CANCELLED') {
        dAgg.cancelledLoads += 1;
      } else if (load.status === 'TONU') {
        dAgg.tonuLoads += 1;
      } else if (load.status === 'PENDING' || load.status === 'IN_TRANSIT') {
        dAgg.pendingOrTransitLoads += 1;
      }

      let bAgg = brokerMap.get(load.brokerName);
      if (!bAgg) {
        bAgg = {
          totalLoads: 0,
          deliveredLoads: 0,
          totalMiles: 0,
          loadedMiles: 0,
          deadheadMiles: 0,
          grossRevenueDeliveredCents: 0,
        };
        brokerMap.set(load.brokerName, bAgg);
      }
      bAgg.totalLoads += 1;
      bAgg.totalMiles += miles;
      bAgg.loadedMiles += lm;
      bAgg.deadheadMiles += dh;
      if (load.status === 'DELIVERED') {
        bAgg.deliveredLoads += 1;
        bAgg.grossRevenueDeliveredCents += grossLineCents(load);
      }
    }

    const revenueByMonthArr = Array.from(revenueByMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, revenueCents]) => {
        const [y, m] = monthKey.split('-').map(Number);
        const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', {
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        });
        return { monthKey, label, revenueCents };
      });

    const drivers = Array.from(driverMap.entries())
      .map(([driverId, a]) => ({
        driverId,
        firstName: a.firstName,
        lastName: a.lastName,
        driverType: a.driverType,
        totalLoads: a.totalLoads,
        deliveredLoads: a.deliveredLoads,
        cancelledLoads: a.cancelledLoads,
        tonuLoads: a.tonuLoads,
        pendingOrTransitLoads: a.pendingOrTransitLoads,
        workDays: a.dayKeys.size,
        totalMiles: a.totalMiles,
        loadedMiles: a.loadedMiles,
        deadheadMiles: a.deadheadMiles,
        grossRevenueDeliveredCents: a.grossRevenueDeliveredCents,
      }))
      .sort((x, y) => y.grossRevenueDeliveredCents - x.grossRevenueDeliveredCents);

    const brokers = Array.from(brokerMap.entries())
      .map(([brokerName, a]) => ({
        brokerName,
        totalLoads: a.totalLoads,
        deliveredLoads: a.deliveredLoads,
        grossRevenueDeliveredCents: a.grossRevenueDeliveredCents,
        totalMiles: a.totalMiles,
        loadedMiles: a.loadedMiles,
        deadheadMiles: a.deadheadMiles,
      }))
      .sort((x, y) => y.grossRevenueDeliveredCents - x.grossRevenueDeliveredCents);

    let totalDriverWorkDays = 0;
    for (const d of drivers) {
      totalDriverWorkDays += d.workDays;
    }

    return {
      range: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      basis:
        'Loads are included when pickupDate (UTC) is within the selected range. Revenue counts only DELIVERED loads (rate + extras).',
      company: {
        totalLoads: loads.length,
        byStatus,
        deliveredLoads,
        grossRevenueDeliveredCents,
        totalMiles: companyTotalMiles,
        loadedMiles: companyLoadedMiles,
        deadheadMiles: companyDeadheadMiles,
        driversWithLoads: driverMap.size,
        totalDriverWorkDays,
        fleetActiveCalendarDays: fleetDayKeys.size,
      },
      revenueByMonth: revenueByMonthArr,
      drivers,
      brokers,
    };
  }
}

export const reportsService = new ReportsService();
