import type { AccountingEntryKind } from '@haulyard/shared-types';

export type { AccountingEntryKind };

export interface AccountingEntry {
  id: string;
  kind: AccountingEntryKind;
  category: string;
  date: string;
  amount: number;
  vendor: string | null;
  description: string | null;
  paymentMethod: string | null;
  reference: string | null;
  truckId: string | null;
  truck: { id: string; unitNumber: string } | null;
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
  partial: boolean;
}

export interface ProfitAndLoss {
  range: { from: string; to: string };
  preset: string | null;
  income: { lines: PnlLine[]; totalCents: number };
  expenses: { lines: PnlLine[]; totalCents: number };
  netCents: number;
  months: PnlMonth[];
}

/** Entry dates are calendar days stored at UTC midnight. */
export function formatEntryDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function todayInputValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** "$1,234.56" → cents; `null` when the text is not a positive amount. */
export function parseMoneyInput(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  return cents > 0 ? cents : null;
}
