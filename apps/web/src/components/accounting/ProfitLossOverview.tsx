'use client';

import { formatCurrency } from '@/lib/utils';
import type { PnlLine, ProfitAndLoss } from '@/lib/accounting';

function formatCompact(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const dollars = Math.abs(cents) / 100;
  if (dollars >= 1_000_000) return `${sign}$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 10_000) return `${sign}$${Math.round(dollars / 1_000)}k`;
  if (dollars >= 1_000) return `${sign}$${(dollars / 1_000).toFixed(1)}k`;
  return `${sign}$${Math.round(dollars)}`;
}

function StatCard({ label, value, tone, hint }: { label: string; value: string; tone: string; hint?: string }) {
  return (
    <div className="card">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-[var(--text-muted)]">{hint}</p> : null}
    </div>
  );
}

function MonthlyBars({ months }: { months: ProfitAndLoss['months'] }) {
  const max = Math.max(1, ...months.flatMap((m) => [m.incomeCents, m.expenseCents]));
  return (
    <div className="card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Income vs expenses by month</h3>
        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Income
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> Expenses
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="flex min-w-max items-end gap-3 sm:gap-5" style={{ minHeight: 220 }}>
          {months.map((m) => (
            <div key={m.monthKey} className="flex w-20 flex-col items-center">
              <div className="flex h-44 items-end gap-1">
                {[
                  { cents: m.incomeCents, color: 'bg-emerald-500', title: 'Income' },
                  { cents: m.expenseCents, color: 'bg-red-500', title: 'Expenses' },
                ].map((bar) => (
                  <div
                    key={bar.title}
                    title={`${bar.title}: ${formatCurrency(bar.cents)}`}
                    className={`w-6 rounded-t ${bar.color} ${m.partial ? 'opacity-60' : ''}`}
                    style={{ height: `${Math.max(bar.cents > 0 ? 3 : 1, (bar.cents / max) * 100)}%` }}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs font-medium text-[var(--text-secondary)]">{m.label}</p>
              <p className={`text-xs font-semibold tabular-nums ${m.netCents >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                {formatCompact(m.netCents)}
              </p>
              {m.partial ? <p className="text-[10px] text-[var(--text-muted)]">partial</p> : null}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs text-[var(--text-muted)]">The number under each month is its net profit.</p>
    </div>
  );
}

function LinesTable({ title, lines, totalCents, tone }: { title: string; lines: PnlLine[]; totalCents: number; tone: string }) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="border-b border-[var(--border-color)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">{title}</div>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-[var(--border-color)]">
          {lines.map((line) => (
            <tr key={line.key}>
              <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                {line.label}
                {line.source === 'auto' ? (
                  <span className="ml-2 rounded border border-[var(--border-color)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                    auto
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-primary)]">{formatCurrency(line.amountCents)}</td>
            </tr>
          ))}
          <tr className="bg-[var(--bg-secondary)] font-semibold">
            <td className="px-4 py-2.5 text-[var(--text-primary)]">Total</td>
            <td className={`px-4 py-2.5 text-right tabular-nums ${tone}`}>{formatCurrency(totalCents)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function ProfitLossOverview({ data }: { data: ProfitAndLoss }) {
  const margin = data.income.totalCents > 0 ? (data.netCents / data.income.totalCents) * 100 : null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Income" value={formatCurrency(data.income.totalCents)} tone="text-emerald-500" />
        <StatCard label="Expenses" value={formatCurrency(data.expenses.totalCents)} tone="text-red-400" />
        <StatCard
          label="Net profit"
          value={formatCurrency(data.netCents)}
          tone={data.netCents >= 0 ? 'text-emerald-500' : 'text-red-400'}
          hint={margin === null ? undefined : `${margin.toFixed(1)}% margin`}
        />
      </div>

      <MonthlyBars months={data.months} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LinesTable title="Income" lines={data.income.lines} totalCents={data.income.totalCents} tone="text-emerald-500" />
        <LinesTable title="Expenses" lines={data.expenses.lines} totalCents={data.expenses.totalCents} tone="text-red-400" />
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Lines marked auto come from the rest of the app: load revenue by delivery month, driver and dispatcher statements by
        period end, fuel and toll transactions, and factoring fees. Do not enter those again as expenses here.
      </p>
    </div>
  );
}
