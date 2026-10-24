import { PayStructure } from '@prisma/client';

export type SettlementLoadRole = 'DRIVER' | 'OWNER' | 'OWNER_DRIVER';

export interface LoadPayInput {
  role: SettlementLoadRole;
  grossRevenueCents: number;
  payStructure: PayStructure;
  payRate: number;
  totalMiles: number;
  companyCommissionRateHundredths: number;
}

export interface LoadPayResult {
  calculatedGrossCents: number;
  companyCommissionCents: number;
}

/** Gross revenue from load rate fields (cents). */
export function grossRevenueFromLoad(load: {
  rateTotal: number;
  detentionPay?: number | null;
  lumperFee?: number | null;
  tonuAmount?: number | null;
}): number {
  return (
    load.rateTotal +
    (load.detentionPay || 0) +
    (load.lumperFee || 0) +
    (load.tonuAmount || 0)
  );
}

export function driverPayCents(
  grossRev: number,
  payStructure: PayStructure,
  payRate: number,
  totalMiles: number
): number {
  if (payStructure === 'PERCENTAGE') {
    return Math.round((grossRev * payRate) / 10000);
  }
  if (payStructure === 'PER_MILE') {
    return payRate * (totalMiles || 0);
  }
  return payRate || 0;
}

export function calculateLoadSettlementAmounts(input: LoadPayInput): LoadPayResult {
  const grossRev = input.grossRevenueCents;
  const commissionRate = input.companyCommissionRateHundredths;
  const driverPay = driverPayCents(
    grossRev,
    input.payStructure,
    input.payRate,
    input.totalMiles
  );

  if (input.role === 'OWNER_DRIVER') {
    const commission = Math.round((grossRev * commissionRate) / 10000);
    return {
      companyCommissionCents: commission,
      calculatedGrossCents: grossRev - commission,
    };
  }

  if (input.role === 'OWNER') {
    const commission = Math.round((grossRev * commissionRate) / 10000);
    return {
      companyCommissionCents: commission,
      calculatedGrossCents: grossRev - commission - driverPay,
    };
  }

  return {
    companyCommissionCents: 0,
    calculatedGrossCents: driverPay,
  };
}

export interface PeriodAdjustment {
  date: Date;
  isRecurring: boolean;
  /** Periods of the settlements this deduction/credit is already on. */
  settledPeriods: { periodStart: Date; periodEnd: Date }[];
}

/**
 * A one-off deduction/credit is settled once, on a statement whose period contains its date.
 * A recurring one applies to every period from its date on, but only once per period.
 */
export function isAdjustmentEligible(
  item: PeriodAdjustment,
  start: Date,
  end: Date,
  isWithinPeriod: (date: Date, start: Date, end: Date) => boolean,
): boolean {
  if (!item.isRecurring) {
    return item.settledPeriods.length === 0 && isWithinPeriod(item.date, start, end);
  }
  const started = isWithinPeriod(item.date, start, end) || item.date.getTime() <= start.getTime();
  if (!started) return false;
  return !item.settledPeriods.some((p) => p.periodStart <= end && p.periodEnd >= start);
}

/** When the same load is both driver-assigned and owner-truck, treat as OWNER_DRIVER. */
export function resolveLoadRole(
  hasDriverAssignment: boolean,
  hasOwnerTruck: boolean
): SettlementLoadRole {
  if (hasDriverAssignment && hasOwnerTruck) return 'OWNER_DRIVER';
  if (hasOwnerTruck) return 'OWNER';
  return 'DRIVER';
}
