import type { LoadStatus, LoadStopType } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import { calendarDayInZone, getLoadWorkDate } from '../../utils/datePeriod';
import { addDays, isoDayToUtcDate, weekEndOf, weekStartOf } from './driver-portal.week';

/**
 * Everything a driver sees about their own work. Broker identity (name, MC, agent, and the
 * dispatcher who booked the load) is deliberately absent from every shape in this file — the
 * Prisma selects below are explicit so a schema change cannot leak those columns in later.
 */
export interface DriverLoad {
  id: string;
  loadNumber: string;
  status: LoadStatus;
  pickupLocation: string;
  pickupDate: Date;
  deliveryLocation: string;
  deliveryDate: Date | null;
  actualDeliveryDate: Date | null;
  loadedMiles: number;
  deadheadMiles: number;
  totalMiles: number;
  grossCents: number;
  paid: boolean;
  statementNumber: string | null;
  stops: {
    sequence: number;
    type: LoadStopType;
    location: string;
    address: string | null;
    scheduledAt: Date | null;
  }[];
}

export interface DriverLoadWeek {
  weekStart: string;
  weekEnd: string;
  loadCount: number;
  paidLoadCount: number;
  totalMiles: number;
  grossCents: number;
  loads: DriverLoad[];
}

export interface DriverFuelEntry {
  id: string;
  date: Date;
  merchant: string | null;
  truckUnitNumber: string;
  gallons: number | null;
  grossCents: number;
  discountCents: number;
  netCents: number;
}

export interface DriverFuelWeek {
  weekStart: string;
  weekEnd: string;
  gallons: number;
  grossCents: number;
  discountCents: number;
  netCents: number;
  entries: DriverFuelEntry[];
}

const loadSelect = {
  id: true,
  loadNumber: true,
  status: true,
  pickupLocation: true,
  pickupDate: true,
  deliveryLocation: true,
  deliveryDate: true,
  actualDeliveryDate: true,
  loadedMiles: true,
  deadheadMiles: true,
  totalMiles: true,
  rateTotal: true,
  detentionPay: true,
  lumperFee: true,
  tonuAmount: true,
  truckId: true,
  stops: {
    select: { sequence: true, type: true, location: true, address: true, scheduledAt: true },
    orderBy: { sequence: 'asc' },
  },
} as const;

type LoadRow = {
  id: string;
  loadNumber: string;
  status: LoadStatus;
  pickupLocation: string;
  pickupDate: Date;
  deliveryLocation: string;
  deliveryDate: Date | null;
  actualDeliveryDate: Date | null;
  loadedMiles: number | null;
  deadheadMiles: number | null;
  totalMiles: number | null;
  rateTotal: number;
  detentionPay: number | null;
  lumperFee: number | null;
  tonuAmount: number | null;
  truckId: string;
  stops: {
    sequence: number;
    type: LoadStopType;
    location: string;
    address: string | null;
    scheduledAt: Date | null;
  }[];
};

/** Matches the gross the office sees on the load list, so the two never disagree. */
function grossCentsOf(load: LoadRow): number {
  return load.rateTotal + (load.detentionPay || 0) + (load.lumperFee || 0) + (load.tonuAmount || 0);
}

function milesOf(load: LoadRow): number {
  if (load.totalMiles != null && load.totalMiles > 0) return load.totalMiles;
  return (load.loadedMiles ?? 0) + (load.deadheadMiles ?? 0);
}

/** The week a load belongs to, resolved in the business time zone like settlements do. */
function loadWeekStart(load: LoadRow): string | null {
  const workDate = getLoadWorkDate(load);
  if (!workDate) return null;
  return weekStartOf(calendarDayInZone(workDate));
}

function today(): string {
  return calendarDayInZone(new Date());
}

/** Start of the oldest week in range, with a day of slack so zone offsets cannot clip a load. */
function rangeStart(weeks: number): { cutoffDay: string; queryFrom: Date } {
  const cutoffDay = addDays(weekStartOf(today()), -7 * (weeks - 1));
  return { cutoffDay, queryFrom: isoDayToUtcDate(addDays(cutoffDay, -1)) };
}

export class DriverPortalService {
  private async requireDriver(tenantId: string, driverId: string) {
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, companyId: tenantId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!driver) {
      throw new AppError(404, 'DRIVER_NOT_FOUND', 'Driver not found');
    }
    return driver;
  }

  private async fetchLoads(tenantId: string, driverId: string, queryFrom: Date): Promise<LoadRow[]> {
    return prisma.load.findMany({
      where: {
        companyId: tenantId,
        driverId,
        status: { not: 'CANCELLED' },
        OR: [
          { actualDeliveryDate: { gte: queryFrom } },
          { deliveryDate: { gte: queryFrom } },
          { pickupDate: { gte: queryFrom } },
        ],
      },
      select: loadSelect,
      orderBy: { pickupDate: 'desc' },
    }) as unknown as Promise<LoadRow[]>;
  }

  /** Statement number per load, so a driver can tell which loads have already been paid out. */
  private async fetchPaidLoads(
    tenantId: string,
    driverId: string,
    loadIds: string[],
  ): Promise<Map<string, string | null>> {
    if (loadIds.length === 0) return new Map();
    const lines = await prisma.settlementLine.findMany({
      where: {
        loadId: { in: loadIds },
        settlement: { companyId: tenantId, driverId, status: { in: ['FINALIZED', 'PAID'] } },
      },
      select: { loadId: true, settlement: { select: { statementNumber: true } } },
    });
    return new Map(lines.map((line) => [line.loadId, line.settlement.statementNumber]));
  }

  async getWeeklyLoads(tenantId: string, driverId: string, weeks: number): Promise<DriverLoadWeek[]> {
    const { cutoffDay, queryFrom } = rangeStart(weeks);
    const rows = await this.fetchLoads(tenantId, driverId, queryFrom);
    const paid = await this.fetchPaidLoads(
      tenantId,
      driverId,
      rows.map((row) => row.id),
    );

    const buckets = new Map<string, DriverLoadWeek>();
    for (const row of rows) {
      const weekStart = loadWeekStart(row);
      if (!weekStart || weekStart < cutoffDay) continue;

      let week = buckets.get(weekStart);
      if (!week) {
        week = {
          weekStart,
          weekEnd: weekEndOf(weekStart),
          loadCount: 0,
          paidLoadCount: 0,
          totalMiles: 0,
          grossCents: 0,
          loads: [],
        };
        buckets.set(weekStart, week);
      }

      const isPaid = paid.has(row.id);
      const miles = milesOf(row);
      const gross = grossCentsOf(row);

      week.loadCount += 1;
      week.paidLoadCount += isPaid ? 1 : 0;
      week.totalMiles += miles;
      week.grossCents += gross;
      week.loads.push({
        id: row.id,
        loadNumber: row.loadNumber,
        status: row.status,
        pickupLocation: row.pickupLocation,
        pickupDate: row.pickupDate,
        deliveryLocation: row.deliveryLocation,
        deliveryDate: row.deliveryDate,
        actualDeliveryDate: row.actualDeliveryDate,
        loadedMiles: row.loadedMiles ?? 0,
        deadheadMiles: row.deadheadMiles ?? 0,
        totalMiles: miles,
        grossCents: gross,
        paid: isPaid,
        statementNumber: paid.get(row.id) ?? null,
        stops: row.stops,
      });
    }

    return [...buckets.values()].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  }

  /**
   * Fuel cards belong to trucks rather than drivers, so a purchase is treated as this driver's
   * when the truck ran one of their loads that same week, or when it was already charged to one
   * of their settlements.
   */
  async getWeeklyFuel(tenantId: string, driverId: string, weeks: number): Promise<DriverFuelWeek[]> {
    const { cutoffDay, queryFrom } = rangeStart(weeks);
    const rows = await this.fetchLoads(tenantId, driverId, queryFrom);

    const trucksByWeek = new Map<string, Set<string>>();
    const truckIds = new Set<string>();
    for (const row of rows) {
      const weekStart = loadWeekStart(row);
      if (!weekStart || weekStart < cutoffDay) continue;
      truckIds.add(row.truckId);
      const trucks = trucksByWeek.get(weekStart) ?? new Set<string>();
      trucks.add(row.truckId);
      trucksByWeek.set(weekStart, trucks);
    }

    const settled = await prisma.settlementFuelTransaction.findMany({
      where: {
        settlement: { companyId: tenantId, driverId },
        fuelTransaction: { date: { gte: queryFrom } },
      },
      select: { fuelTransactionId: true },
    });
    const settledIds = new Set(settled.map((row) => row.fuelTransactionId));

    if (truckIds.size === 0 && settledIds.size === 0) return [];

    const transactions = await prisma.fuelTransaction.findMany({
      where: {
        companyId: tenantId,
        date: { gte: queryFrom },
        OR: [{ truckId: { in: [...truckIds] } }, { id: { in: [...settledIds] } }],
      },
      select: {
        id: true,
        date: true,
        merchant: true,
        gallons: true,
        grossAmount: true,
        discount: true,
        netAmount: true,
        truckId: true,
        truck: { select: { unitNumber: true } },
      },
      orderBy: { date: 'desc' },
    });

    const buckets = new Map<string, DriverFuelWeek>();
    for (const transaction of transactions) {
      const weekStart = weekStartOf(calendarDayInZone(transaction.date));
      if (weekStart < cutoffDay) continue;

      const drivenThisWeek = trucksByWeek.get(weekStart)?.has(transaction.truckId) ?? false;
      if (!drivenThisWeek && !settledIds.has(transaction.id)) continue;

      let week = buckets.get(weekStart);
      if (!week) {
        week = {
          weekStart,
          weekEnd: weekEndOf(weekStart),
          gallons: 0,
          grossCents: 0,
          discountCents: 0,
          netCents: 0,
          entries: [],
        };
        buckets.set(weekStart, week);
      }

      week.gallons += transaction.gallons ?? 0;
      week.grossCents += transaction.grossAmount;
      week.discountCents += transaction.discount;
      week.netCents += transaction.netAmount;
      week.entries.push({
        id: transaction.id,
        date: transaction.date,
        merchant: transaction.merchant,
        truckUnitNumber: transaction.truck.unitNumber,
        gallons: transaction.gallons,
        grossCents: transaction.grossAmount,
        discountCents: transaction.discount,
        netCents: transaction.netAmount,
      });
    }

    return [...buckets.values()].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  }

  async getSummary(tenantId: string, driverId: string) {
    const driver = await this.requireDriver(tenantId, driverId);

    const settlements = await prisma.settlement.findMany({
      where: { companyId: tenantId, driverId, status: { in: ['FINALIZED', 'PAID'] } },
      select: {
        id: true,
        statementNumber: true,
        periodStart: true,
        periodEnd: true,
        status: true,
        grossAmount: true,
        deductionTotal: true,
        creditTotal: true,
        netAmount: true,
        _count: { select: { lines: true } },
      },
      orderBy: { periodStart: 'desc' },
      take: 16,
    });

    const now = new Date();
    const ytdStart = new Date(now.getFullYear(), 0, 1);

    let last4WeeksCents = 0;
    let ytdCents = 0;
    let allTimeCents = 0;
    settlements.forEach((settlement, index) => {
      allTimeCents += settlement.netAmount;
      if (settlement.periodEnd >= ytdStart) ytdCents += settlement.netAmount;
      if (index < 4) last4WeeksCents += settlement.netAmount;
    });

    const latest = settlements[0];
    const currentWeek = (await this.getWeeklyLoads(tenantId, driverId, 1))[0] ?? null;

    return {
      driver,
      totals: { last4WeeksCents, ytdCents, allTimeCents },
      lastStatement: latest
        ? {
            settlementId: latest.id,
            statementNumber: latest.statementNumber,
            periodStart: latest.periodStart,
            periodEnd: latest.periodEnd,
            status: latest.status,
            grossCents: latest.grossAmount,
            deductionCents: latest.deductionTotal,
            creditCents: latest.creditTotal,
            netCents: latest.netAmount,
            loadCount: latest._count.lines,
          }
        : null,
      currentWeek: currentWeek
        ? {
            weekStart: currentWeek.weekStart,
            weekEnd: currentWeek.weekEnd,
            loadCount: currentWeek.loadCount,
            totalMiles: currentWeek.totalMiles,
            grossCents: currentWeek.grossCents,
            paidLoadCount: currentWeek.paidLoadCount,
          }
        : null,
      weeklyEarnings: settlements.map((settlement) => ({
        settlementId: settlement.id,
        statementNumber: settlement.statementNumber,
        periodStart: settlement.periodStart,
        periodEnd: settlement.periodEnd,
        status: settlement.status,
        netAmountCents: settlement.netAmount,
      })),
    };
  }
}

export const driverPortalService = new DriverPortalService();
