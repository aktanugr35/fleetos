type HeatmapGranularity = 'month' | 'week';

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const WEEK_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

const US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC',
]);

function normalizeMetric(value: number, min: number, max: number): number {
  if (max === min) return value > 0 ? 1 : 0;
  return (value - min) / (max - min);
}

function bucketFromScore(score: number): 'hot' | 'warm' | 'cool' | 'cold' {
  if (score >= 75) return 'hot';
  if (score >= 50) return 'warm';
  if (score >= 25) return 'cool';
  return 'cold';
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function startOfLocalWeek(date: Date): Date {
  const d = startOfLocalDay(date);
  // Monday-first week
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(d, offset);
}

function monthLabel(date: Date): string {
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

function weekLabel(start: Date, endExclusive: Date): string {
  const end = addDays(endExclusive, -1);
  const startText = start.toLocaleString('en-US', { month: 'short', day: 'numeric' });
  const endText = end.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startText} - ${endText}`;
}

export interface HeatmapPeriod {
  key: string;
  label: string;
  start: Date;
  endExclusive: Date;
}

export function resolveHeatmapPeriod(
  granularity: HeatmapGranularity,
  periodKey?: string,
  anchor = new Date(),
): HeatmapPeriod {
  if (granularity === 'month') {
    const currentMonthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const key = periodKey && MONTH_KEY_RE.test(periodKey)
      ? periodKey
      : `${currentMonthStart.getFullYear()}-${String(currentMonthStart.getMonth() + 1).padStart(2, '0')}`;
    const [year, month] = key.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const endExclusive = new Date(year, month, 1);
    return { key, label: monthLabel(start), start, endExclusive };
  }

  const defaultWeekStart = startOfLocalWeek(anchor);
  const key = periodKey && WEEK_KEY_RE.test(periodKey)
    ? periodKey
    : `${defaultWeekStart.getFullYear()}-${String(defaultWeekStart.getMonth() + 1).padStart(2, '0')}-${String(defaultWeekStart.getDate()).padStart(2, '0')}`;
  const [year, month, day] = key.split('-').map(Number);
  const start = startOfLocalWeek(new Date(year, month - 1, day));
  const endExclusive = addDays(start, 7);
  return { key, label: weekLabel(start, endExclusive), start, endExclusive };
}

export function buildHeatmapAvailablePeriods(
  granularity: HeatmapGranularity,
  count = 12,
  anchor = new Date(),
): Array<{ key: string; label: string }> {
  if (granularity === 'month') {
    return Array.from({ length: count }).map((_, i) => {
      const date = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return { key, label: monthLabel(date) };
    });
  }

  const currentWeekStart = startOfLocalWeek(anchor);
  return Array.from({ length: count }).map((_, i) => {
    const start = addDays(currentWeekStart, -7 * i);
    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    return { key, label: weekLabel(start, addDays(start, 7)) };
  });
}

export function parsePickupStateCode(pickupLocation: string): string | null {
  const state = pickupLocation.split(',').at(-1)?.trim().toUpperCase();
  if (!state || state.length !== 2) return null;
  return US_STATE_CODES.has(state) ? state : null;
}

export interface HeatmapMetricRow {
  stateCode: string;
  loadCount: number;
  revenueCents: number;
  avgWaitDays: number;
}

export interface HeatmapScoredRow extends HeatmapMetricRow {
  score: number;
  bucket: 'hot' | 'warm' | 'cool' | 'cold';
  components: {
    loadCountNorm: number;
    revenueNorm: number;
    waitNorm: number;
  };
}

export function scoreHeatmapRows(rows: HeatmapMetricRow[]): HeatmapScoredRow[] {
  if (rows.length === 0) return [];

  const loadValues = rows.map((r) => r.loadCount);
  const revenueValues = rows.map((r) => r.revenueCents);
  const waitValues = rows.map((r) => r.avgWaitDays);

  const loadMin = Math.min(...loadValues);
  const loadMax = Math.max(...loadValues);
  const revenueMin = Math.min(...revenueValues);
  const revenueMax = Math.max(...revenueValues);
  const waitMin = Math.min(...waitValues);
  const waitMax = Math.max(...waitValues);

  return rows.map((row) => {
    const loadCountNorm = normalizeMetric(row.loadCount, loadMin, loadMax);
    const revenueNorm = normalizeMetric(row.revenueCents, revenueMin, revenueMax);
    const waitNorm = normalizeMetric(row.avgWaitDays, waitMin, waitMax);
    const score = Number((100 * (0.5 * loadCountNorm + 0.35 * revenueNorm + 0.15 * waitNorm)).toFixed(1));
    return {
      ...row,
      score,
      bucket: bucketFromScore(score),
      components: { loadCountNorm, revenueNorm, waitNorm },
    };
  });
}
