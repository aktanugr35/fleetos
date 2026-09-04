import api from '@/lib/api';

/**
 * Shapes returned by `/driver-portal/*`. Broker identity is intentionally absent — the API never
 * sends it to a driver, so there is nothing here to render by accident.
 */
export interface DriverLoadStop {
  sequence: number;
  type: 'PICKUP' | 'DELIVERY';
  location: string;
  address: string | null;
  scheduledAt: string | null;
}

export interface DriverLoad {
  id: string;
  loadNumber: string;
  status: string;
  pickupLocation: string;
  pickupDate: string;
  deliveryLocation: string;
  deliveryDate: string | null;
  actualDeliveryDate: string | null;
  loadedMiles: number;
  deadheadMiles: number;
  totalMiles: number;
  grossCents: number;
  paid: boolean;
  statementNumber: string | null;
  stops: DriverLoadStop[];
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
  date: string;
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

export interface DriverWeekTotals {
  weekStart: string;
  weekEnd: string;
  loadCount: number;
  totalMiles: number;
  grossCents: number;
}

export interface DriverPortalSummary {
  driver: { id: string; firstName: string; lastName: string };
  currentWeek: DriverWeekTotals & { paidLoadCount: number };
  last4Weeks: DriverWeekTotals;
}

export interface DriverStatements {
  driver: { id: string; firstName: string; lastName: string };
  totals: { last4WeeksCents: number; ytdCents: number; allTimeCents: number };
  lastStatement: {
    settlementId: string;
    statementNumber: string | null;
    periodStart: string;
    periodEnd: string;
    status: string;
    grossCents: number;
    deductionCents: number;
    creditCents: number;
    netCents: number;
    loadCount: number;
  } | null;
  weeklyEarnings: Array<{
    settlementId: string;
    statementNumber: string | null;
    periodStart: string;
    periodEnd: string;
    status: string;
    netAmountCents: number;
  }>;
}

export type DriverComplianceStatus = 'VALID' | 'DUE_SOON' | 'EXPIRED' | 'MISSING' | 'NA';

export interface DriverComplianceItem {
  key: string;
  label: string;
  category: string;
  detail: string | null;
  expiryDate: string | null;
  status: DriverComplianceStatus;
  daysRemaining: number | null;
}

export interface DriverCompliance {
  driver: { id: string; firstName: string; lastName: string; cdlNumber: string; cdlState: string };
  items: DriverComplianceItem[];
}

export const WEEK_RANGE_OPTIONS = [4, 8, 12, 26, 52];

export async function fetchDriverSummary(): Promise<DriverPortalSummary> {
  const res = await api.get('/driver-portal/summary');
  return res.data.data;
}

export async function fetchDriverStatements(): Promise<DriverStatements> {
  const res = await api.get('/driver-portal/statements');
  return res.data.data;
}

export async function fetchDriverCompliance(): Promise<DriverCompliance> {
  const res = await api.get('/driver-portal/compliance');
  return res.data.data;
}

/** US formatting regardless of the phone's locale, matching the rest of the app's currency. */
export function formatMiles(miles: number): string {
  return miles.toLocaleString('en-US');
}

/** Revenue per mile — the number drivers actually compare loads on. */
export function ratePerMile(grossCents: number, miles: number): number | null {
  if (!miles) return null;
  return grossCents / 100 / miles;
}

export async function fetchDriverLoadWeeks(weeks: number): Promise<DriverLoadWeek[]> {
  const res = await api.get('/driver-portal/loads', { params: { weeks } });
  return res.data.data.weeks;
}

export async function fetchDriverFuelWeeks(weeks: number): Promise<DriverFuelWeek[]> {
  const res = await api.get('/driver-portal/fuel', { params: { weeks } });
  return res.data.data.weeks;
}

/** Week bounds arrive as plain YYYY-MM-DD, so format them without a timezone round-trip. */
export function formatWeekRange(weekStart: string, weekEnd: string): string {
  return `${formatIsoDay(weekStart)} — ${formatIsoDay(weekEnd)}`;
}

export function formatIsoDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  if (!year || !month || !date) return day;
  return new Date(year, month - 1, date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
