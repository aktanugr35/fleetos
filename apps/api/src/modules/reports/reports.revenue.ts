import type { Load, LoadStatus, Prisma } from '@prisma/client';

type LoadGrossFields = Pick<
  Load,
  'rateTotal' | 'detentionPay' | 'lumperFee' | 'fuelSurcharge' | 'tonuAmount'
>;

type LoadDeliveryFields = Pick<Load, 'deliveryDate' | 'actualDeliveryDate'> & { pickupDate?: Date };

/** Statuses whose loads earn revenue: delivered loads and TONU (truck ordered, not used) pay-outs. */
export const REVENUE_STATUSES = ['DELIVERED', 'TONU'] as const satisfies readonly LoadStatus[];

export function earnsRevenue(status: LoadStatus): boolean {
  return (REVENUE_STATUSES as readonly LoadStatus[]).includes(status);
}

export function grossLineCents(load: LoadGrossFields): number {
  return (
    load.rateTotal +
    (load.detentionPay ?? 0) +
    (load.lumperFee ?? 0) +
    (load.fuelSurcharge ?? 0) +
    (load.tonuAmount ?? 0)
  );
}

export function effectiveDeliveryDate(load: LoadDeliveryFields): Date | null {
  return load.actualDeliveryDate ?? load.deliveryDate ?? null;
}

/**
 * The date a load's revenue belongs to: when it was delivered, or its pickup date when no
 * delivery date was ever entered (typical for TONU). Dashboard and Reports must both use this.
 */
export function revenueDate(load: LoadDeliveryFields): Date | null {
  return effectiveDeliveryDate(load) ?? load.pickupDate ?? null;
}

/** Prisma filter matching loads whose {@link revenueDate} is in [from, to). */
export function revenueDateWhere(from: Date, toExclusive: Date): Prisma.LoadWhereInput {
  const range = { gte: from, lt: toExclusive };
  return {
    OR: [
      { actualDeliveryDate: range },
      { actualDeliveryDate: null, deliveryDate: range },
      { actualDeliveryDate: null, deliveryDate: null, pickupDate: range },
    ],
  };
}

export interface MonthRevenueLoad {
  id: string;
  loadNumber: string;
  puNumber: string | null;
  brokerName: string;
  status: LoadStatus;
  revenueDate: string;
  amountCents: number;
}

export interface MonthRevenue {
  monthKey: string;
  label: string;
  revenueCents: number;
  loadCount: number;
  /** The range covers only part of this month, so the bar is not a full month. */
  partial: boolean;
  loads: MonthRevenueLoad[];
}

export function utcMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** One entry per UTC calendar month from `from` to `to`, zero-filled, oldest first. */
export function buildMonthlySeries(from: Date, to: Date, loadsByMonth: Map<string, MonthRevenueLoad[]>): MonthRevenue[] {
  const series: MonthRevenue[] = [];
  let y = from.getUTCFullYear();
  let m = from.getUTCMonth();
  const lastKey = utcMonthKey(to);
  for (;;) {
    const monthStart = new Date(Date.UTC(y, m, 1));
    const nextMonthStart = new Date(Date.UTC(y, m + 1, 1));
    const monthKey = utcMonthKey(monthStart);
    const loads = (loadsByMonth.get(monthKey) ?? []).sort((a, b) => a.revenueDate.localeCompare(b.revenueDate));
    series.push({
      monthKey,
      label: monthStart.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
      revenueCents: loads.reduce((sum, l) => sum + l.amountCents, 0),
      loadCount: loads.length,
      partial: from > monthStart || to.getTime() < nextMonthStart.getTime() - 1,
      loads,
    });
    if (monthKey === lastKey) break;
    m += 1;
    if (m === 12) {
      m = 0;
      y += 1;
    }
  }
  return series;
}

export function localMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function isInLocalCalendarMonth(date: Date, anchor: Date): boolean {
  return date.getFullYear() === anchor.getFullYear() && date.getMonth() === anchor.getMonth();
}

export function monthLabelFromKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

export function sumDeliveredGrossByDeliveryMonth<T extends LoadGrossFields & LoadDeliveryFields>(
  loads: T[],
  options?: { from?: Date; to?: Date },
): Map<string, number> {
  const grouped = new Map<string, number>();
  for (const load of loads) {
    const deliveredOn = revenueDate(load);
    if (!deliveredOn) continue;
    if (options?.from && deliveredOn < options.from) continue;
    if (options?.to && deliveredOn > options.to) continue;
    const key = localMonthKey(deliveredOn);
    grouped.set(key, (grouped.get(key) ?? 0) + grossLineCents(load));
  }
  return grouped;
}

export function currentMonthDeliveredGrossCents<T extends LoadGrossFields & LoadDeliveryFields>(
  loads: T[],
  anchor = new Date(),
): number {
  let total = 0;
  for (const load of loads) {
    const deliveredOn = revenueDate(load);
    if (!deliveredOn || !isInLocalCalendarMonth(deliveredOn, anchor)) continue;
    total += grossLineCents(load);
  }
  return total;
}
