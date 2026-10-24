import { prisma } from '../../config/database';
import type { LoadStatus } from '@prisma/client';
import {
  currentMonthDeliveredGrossCents,
  earnsRevenue,
  grossLineCents,
  REVENUE_STATUSES,
  revenueDate,
  revenueDateWhere,
  sumDeliveredGrossByDeliveryMonth,
  buildMonthlySeries,
  utcMonthKey,
  type MonthRevenue,
  type MonthRevenueLoad,
} from './reports.revenue';
import { createBrokerResolver } from './broker-identity';

async function loadBrokerResolver(tenantId: string) {
  const brokers = await prisma.broker.findMany({
    where: { companyId: tenantId },
    select: { id: true, name: true, mcNumber: true },
  });
  return createBrokerResolver(brokers);
}

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
  revenueByMonth: MonthRevenue[];
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
        status: { in: [...REVENUE_STATUSES] },
        ...revenueDateWhere(monthStart, nextMonthStart),
      },
      select: {
        rateTotal: true,
        detentionPay: true,
        lumperFee: true,
        fuelSurcharge: true,
        tonuAmount: true,
        deliveryDate: true,
        actualDeliveryDate: true,
        pickupDate: true,
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
        status: { in: [...REVENUE_STATUSES] },
        ...revenueDateWhere(startDate, new Date(now.getFullYear(), now.getMonth() + 1, 1)),
      },
      select: {
        deliveryDate: true,
        actualDeliveryDate: true,
        pickupDate: true,
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
        month: key,
        revenue,
      }));
  }

  async getBrokerSummary(tenantId: string, limit = 12) {
    const [rows, resolveBroker] = await Promise.all([
      prisma.load.groupBy({
        by: ['brokerId', 'brokerMC', 'brokerName'],
        where: { companyId: tenantId, status: { in: [...REVENUE_STATUSES] } },
        _count: { id: true },
        _sum: { rateTotal: true },
      }),
      loadBrokerResolver(tenantId),
    ]);

    const totals = new Map<string, { brokerName: string; loadCount: number; revenueCents: number }>();
    for (const r of rows) {
      const { key, name } = resolveBroker(r);
      const agg = totals.get(key) ?? { brokerName: name, loadCount: 0, revenueCents: 0 };
      agg.loadCount += r._count.id;
      agg.revenueCents += r._sum.rateTotal || 0;
      totals.set(key, agg);
    }

    return [...totals.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, limit);
  }

  /**
   * [from, to] is inclusive (UTC day bounds from caller). Load counts, miles and work days cover
   * loads picked up in the range; revenue covers DELIVERED and TONU loads whose
   * {@link revenueDate} is in the range, so they match the dashboard.
   */
  async getOperationalAnalytics(
    tenantId: string,
    from: Date,
    to: Date
  ): Promise<OperationalAnalytics> {
    const resolveBroker = await loadBrokerResolver(tenantId);
    const toExclusive = new Date(to.getTime() + 1);
    const loads = await prisma.load.findMany({
      where: {
        companyId: tenantId,
        OR: [
          { pickupDate: { gte: from, lte: to } },
          { status: { in: [...REVENUE_STATUSES] }, ...revenueDateWhere(from, toExclusive) },
        ],
      },
      select: {
        id: true,
        driverId: true,
        brokerId: true,
        brokerMC: true,
        brokerName: true,
        loadNumber: true,
        puNumber: true,
        status: true,
        pickupDate: true,
        deliveryDate: true,
        actualDeliveryDate: true,
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
      brokerName: string;
      totalLoads: number;
      deliveredLoads: number;
      totalMiles: number;
      loadedMiles: number;
      deadheadMiles: number;
      grossRevenueDeliveredCents: number;
    };

    const driverMap = new Map<string, DriverAgg>();
    const brokerMap = new Map<string, BrokerAgg>();
    const revenueByMonth = new Map<string, MonthRevenueLoad[]>();
    const fleetDayKeys = new Set<string>();
    let pickupWindowLoads = 0;

    for (const load of loads) {
      const inPickupWindow = load.pickupDate >= from && load.pickupDate <= to;
      const earnedOn = revenueDate(load);
      const countsAsRevenue = earnsRevenue(load.status) && earnedOn !== null && earnedOn >= from && earnedOn <= to;
      const deliveredInRange = countsAsRevenue && load.status === 'DELIVERED';
      const cents = countsAsRevenue ? grossLineCents(load) : 0;

      const miles = inPickupWindow ? milesForLoad(load) : 0;
      const lm = inPickupWindow ? (load.loadedMiles ?? 0) : 0;
      const dh = inPickupWindow ? (load.deadheadMiles ?? 0) : 0;
      const dayKey = utcYmd(load.pickupDate);

      if (inPickupWindow) {
        pickupWindowLoads += 1;
        byStatus[load.status] = (byStatus[load.status] ?? 0) + 1;
        companyTotalMiles += miles;
        companyLoadedMiles += lm;
        companyDeadheadMiles += dh;
        fleetDayKeys.add(dayKey);
      }

      if (countsAsRevenue && earnedOn) {
        if (deliveredInRange) deliveredLoads += 1;
        grossRevenueDeliveredCents += cents;
        const ym = utcMonthKey(earnedOn);
        const monthLoads = revenueByMonth.get(ym) ?? [];
        monthLoads.push({
          id: load.id,
          loadNumber: load.loadNumber,
          puNumber: load.puNumber,
          brokerName: load.brokerName,
          status: load.status,
          revenueDate: earnedOn.toISOString(),
          amountCents: cents,
        });
        revenueByMonth.set(ym, monthLoads);
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
      if (inPickupWindow) {
        dAgg.totalLoads += 1;
        dAgg.dayKeys.add(dayKey);
        dAgg.totalMiles += miles;
        dAgg.loadedMiles += lm;
        dAgg.deadheadMiles += dh;
        if (load.status === 'CANCELLED') {
          dAgg.cancelledLoads += 1;
        } else if (load.status === 'TONU') {
          dAgg.tonuLoads += 1;
        } else if (load.status === 'PENDING' || load.status === 'IN_TRANSIT') {
          dAgg.pendingOrTransitLoads += 1;
        }
      }
      if (countsAsRevenue) {
        if (deliveredInRange) dAgg.deliveredLoads += 1;
        dAgg.grossRevenueDeliveredCents += cents;
      }

      const broker = resolveBroker(load);
      let bAgg = brokerMap.get(broker.key);
      if (!bAgg) {
        bAgg = {
          brokerName: broker.name,
          totalLoads: 0,
          deliveredLoads: 0,
          totalMiles: 0,
          loadedMiles: 0,
          deadheadMiles: 0,
          grossRevenueDeliveredCents: 0,
        };
        brokerMap.set(broker.key, bAgg);
      }
      if (inPickupWindow) {
        bAgg.totalLoads += 1;
        bAgg.totalMiles += miles;
        bAgg.loadedMiles += lm;
        bAgg.deadheadMiles += dh;
      }
      if (countsAsRevenue) {
        if (deliveredInRange) bAgg.deliveredLoads += 1;
        bAgg.grossRevenueDeliveredCents += cents;
      }
    }

    const revenueByMonthArr = buildMonthlySeries(from, to, revenueByMonth);

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

    const brokers = Array.from(brokerMap.values())
      .map((a) => ({
        brokerName: a.brokerName,
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
        'Load counts, miles and work days use pickupDate (UTC). Revenue covers DELIVERED and TONU loads (rate + extras) by delivery date, falling back to pickup date; delivered counts are DELIVERED only. Same as the dashboard.',
      company: {
        totalLoads: pickupWindowLoads,
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
