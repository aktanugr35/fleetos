import { accountingCategoryLabel } from '@haulyard/shared-types';
import { utcMonthKey } from '../reports/reports.revenue';

export type PnlSide = 'income' | 'expense';

/** Lines filled from the rest of the app rather than from accounting entries. */
export const AUTO_LINES = {
  LOAD_REVENUE: { side: 'income', label: 'Load revenue (Delivered + TONU)' },
  DRIVER_PAY: { side: 'expense', label: 'Driver pay (finalized & paid statements)' },
  DISPATCHER_PAY: { side: 'expense', label: 'Dispatcher pay (finalized & paid statements)' },
  FUEL: { side: 'expense', label: 'Fuel cards' },
  TOLLS: { side: 'expense', label: 'Tolls' },
  FACTORING_FEES: { side: 'expense', label: 'Factoring fees' },
} as const satisfies Record<string, { side: PnlSide; label: string }>;

export type AutoLineKey = keyof typeof AUTO_LINES;

export interface PnlItem {
  side: PnlSide;
  /** An {@link AutoLineKey} or a manual accounting category. */
  key: string;
  date: Date;
  amountCents: number;
}

export interface PnlLine {
  key: string;
  label: string;
  source: 'auto' | 'manual';
  amountCents: number;
}

export interface PnlMonth {
  monthKey: string;
  label: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  /** The range covers only part of this month. */
  partial: boolean;
}

export interface ProfitAndLoss {
  range: { from: string; to: string };
  income: { lines: PnlLine[]; totalCents: number };
  expenses: { lines: PnlLine[]; totalCents: number };
  netCents: number;
  months: PnlMonth[];
}

function isAutoKey(key: string): key is AutoLineKey {
  return key in AUTO_LINES;
}

function buildLines(side: PnlSide, items: PnlItem[]): { lines: PnlLine[]; totalCents: number } {
  const sums = new Map<string, number>();
  for (const item of items) {
    if (item.side !== side) continue;
    sums.set(item.key, (sums.get(item.key) ?? 0) + item.amountCents);
  }

  const autoLines: PnlLine[] = (Object.keys(AUTO_LINES) as AutoLineKey[])
    .filter((key) => AUTO_LINES[key].side === side)
    .map((key) => ({ key, label: AUTO_LINES[key].label, source: 'auto', amountCents: sums.get(key) ?? 0 }));

  const manualLines: PnlLine[] = [...sums.entries()]
    .filter(([key, amount]) => !isAutoKey(key) && amount !== 0)
    .map(([key, amountCents]) => ({ key, label: accountingCategoryLabel(key), source: 'manual' as const, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents);

  const lines = [...autoLines, ...manualLines];
  return { lines, totalCents: lines.reduce((sum, line) => sum + line.amountCents, 0) };
}

/** Totals by line and by UTC calendar month for [from, to]; months are zero-filled, oldest first. */
export function buildProfitAndLoss(from: Date, to: Date, items: PnlItem[]): ProfitAndLoss {
  const byMonth = new Map<string, { income: number; expense: number }>();
  for (const item of items) {
    const key = utcMonthKey(item.date);
    const bucket = byMonth.get(key) ?? { income: 0, expense: 0 };
    if (item.side === 'income') bucket.income += item.amountCents;
    else bucket.expense += item.amountCents;
    byMonth.set(key, bucket);
  }

  const months: PnlMonth[] = [];
  const lastKey = utcMonthKey(to);
  for (let y = from.getUTCFullYear(), m = from.getUTCMonth(); ; m += 1) {
    const monthStart = new Date(Date.UTC(y, m, 1));
    const nextMonthStart = new Date(Date.UTC(y, m + 1, 1));
    const monthKey = utcMonthKey(monthStart);
    const bucket = byMonth.get(monthKey) ?? { income: 0, expense: 0 };
    months.push({
      monthKey,
      label: monthStart.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
      incomeCents: bucket.income,
      expenseCents: bucket.expense,
      netCents: bucket.income - bucket.expense,
      partial: from > monthStart || to.getTime() < nextMonthStart.getTime() - 1,
    });
    if (monthKey === lastKey || months.length > 36) break;
  }

  const income = buildLines('income', items);
  const expenses = buildLines('expense', items);
  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    income,
    expenses,
    netCents: income.totalCents - expenses.totalCents,
    months,
  };
}
