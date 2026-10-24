'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { formatCurrency } from '@/lib/utils';

export interface MonthlyGrossLoad {
  id: string;
  loadNumber: string;
  puNumber: string | null;
  brokerName: string;
  status: string;
  revenueDate: string;
  amountCents: number;
}

export interface MonthlyGrossPoint {
  monthKey: string;
  label: string;
  revenueCents: number;
  loadCount: number;
  partial: boolean;
  loads: MonthlyGrossLoad[];
}

/** Round the axis ceiling up to a readable number so the gridlines land on round money. */
function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function formatCompact(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 10_000) return `$${Math.round(dollars / 1_000)}k`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}k`;
  return `$${Math.round(dollars)}`;
}

function formatUtcDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

const HEIGHT = 300;
const PAD = { top: 28, right: 18, bottom: 44, left: 62 };

/** Tracks the rendered width so the viewBox can use CSS pixels 1:1. */
function useMeasuredWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p className="text-base font-bold tabular-nums text-[var(--text-primary)]">{value}</p>
      {hint ? <p className="text-[10px] text-[var(--text-muted)]">{hint}</p> : null}
    </div>
  );
}

export function MonthlyGrossChart({ data }: { data: MonthlyGrossPoint[] }) {
  const chartId = useId().replace(/:/g, '');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const { ref: panelRef, width: measuredWidth } = useMeasuredWidth();
  const WIDTH = Math.max(measuredWidth, 320);

  const stats = useMemo(() => {
    const total = data.reduce((sum, row) => sum + row.revenueCents, 0);
    const loads = data.reduce((sum, row) => sum + row.loadCount, 0);
    const fullMonths = data.filter((row) => !row.partial);
    const average = fullMonths.length
      ? Math.round(fullMonths.reduce((sum, row) => sum + row.revenueCents, 0) / fullMonths.length)
      : null;
    const best = data.reduce<MonthlyGrossPoint | null>(
      (top, row) => (row.revenueCents > (top?.revenueCents ?? 0) ? row : top),
      null,
    );
    return { total, loads, average, best };
  }, [data]);

  const axisMax = useMemo(() => niceCeiling(Math.max(...data.map((row) => row.revenueCents), 1)), [data]);

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const baseline = PAD.top + innerH;
  const slotW = innerW / Math.max(data.length, 1);
  const barW = Math.min(slotW * 0.58, 72);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => fraction * axisMax);
  const labelStride = slotW < 58 ? 2 : 1;
  const showValues = slotW >= 52;
  const averageY = stats.average != null ? baseline - (stats.average / axisMax) * innerH : null;

  const selected = data.find((row) => row.monthKey === selectedKey) ?? null;

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Range total" value={formatCurrency(stats.total)} />
        <Stat label="Loads" value={String(stats.loads)} hint="Delivered + TONU" />
        <Stat
          label="Monthly average"
          value={stats.average != null ? formatCurrency(stats.average) : '—'}
          hint="Full months only"
        />
        <Stat
          label="Best month"
          value={stats.best ? formatCurrency(stats.best.revenueCents) : '—'}
          hint={stats.best?.label}
        />
      </div>

      <div ref={panelRef} className="report-chart-panel rounded-xl border border-[var(--border-color)] p-3 sm:p-4">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="xMinYMin meet"
          className="report-chart-svg"
          role="img"
          aria-label="Gross revenue by delivery month"
        >
          <defs>
            <linearGradient id={`${chartId}-bar`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: 'var(--haulyard-primary)', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: 'var(--haulyard-primary)', stopOpacity: 0.6 }} />
            </linearGradient>
            <pattern id={`${chartId}-partial`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" style={{ fill: 'var(--haulyard-primary)', fillOpacity: 0.35 }} />
              <line x1="0" y1="0" x2="0" y2="6" style={{ stroke: 'var(--haulyard-primary)', strokeWidth: 3, strokeOpacity: 0.6 }} />
            </pattern>
          </defs>

          {ticks.map((tick) => {
            const y = baseline - (tick / axisMax) * innerH;
            return (
              <g key={tick}>
                <line x1={PAD.left} y1={y} x2={WIDTH - PAD.right} y2={y} className="report-chart-grid" />
                <text x={PAD.left - 10} y={y + 4} textAnchor="end" className="report-chart-axis-label">
                  {formatCompact(tick)}
                </text>
              </g>
            );
          })}

          <line x1={PAD.left} y1={baseline} x2={WIDTH - PAD.right} y2={baseline} className="report-chart-axis" />

          {averageY != null ? (
            <g>
              <line
                x1={PAD.left}
                y1={averageY}
                x2={WIDTH - PAD.right}
                y2={averageY}
                style={{ stroke: 'var(--brand-amber)', strokeDasharray: '5 4', strokeWidth: 1.25 }}
              />
              <text x={WIDTH - PAD.right} y={averageY - 5} textAnchor="end" className="report-chart-axis-label" style={{ fill: 'var(--brand-amber)' }}>
                avg {formatCompact(stats.average!)}
              </text>
            </g>
          ) : null}

          {data.map((row, index) => {
            const slotX = PAD.left + slotW * index;
            const centerX = slotX + slotW / 2;
            const barH = row.revenueCents > 0 ? Math.max(3, (row.revenueCents / axisMax) * innerH) : 0;
            const isHover = hoverIndex === index;
            const isSelected = selectedKey === row.monthKey;
            const fill = row.partial ? `url(#${chartId}-partial)` : `url(#${chartId}-bar)`;

            return (
              <g
                key={row.monthKey}
                className="report-chart-slot"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(null)}
                onClick={() => setSelectedKey((key) => (key === row.monthKey ? null : row.monthKey))}
              >
                {isHover || isSelected ? (
                  <rect x={slotX + 2} y={PAD.top - 20} width={slotW - 4} height={innerH + 20} rx={8} className="report-chart-band" />
                ) : null}
                <rect x={slotX} y={PAD.top - 20} width={slotW} height={innerH + 20} fill="transparent" />

                {barH > 0 ? (
                  <rect
                    x={centerX - barW / 2}
                    y={baseline - barH}
                    width={barW}
                    height={barH}
                    rx={6}
                    fill={fill}
                    opacity={selectedKey && !isSelected ? 0.45 : 1}
                    className={isHover || isSelected ? 'report-chart-bar is-active' : 'report-chart-bar'}
                  />
                ) : (
                  <rect x={centerX - barW / 2} y={baseline - 2} width={barW} height={2} rx={1} style={{ fill: 'var(--border-color)' }} />
                )}

                {showValues || isHover || isSelected ? (
                  <text x={centerX} y={baseline - barH - 7} textAnchor="middle" className="report-chart-value">
                    {row.revenueCents > 0 ? formatCompact(row.revenueCents) : '$0'}
                  </text>
                ) : null}

                {index % labelStride === 0 || isHover || isSelected ? (
                  <text
                    x={centerX}
                    y={HEIGHT - 22}
                    textAnchor="middle"
                    className={isHover || isSelected ? 'report-chart-month is-active' : 'report-chart-month'}
                  >
                    {row.label}
                  </text>
                ) : null}
                <text x={centerX} y={HEIGHT - 8} textAnchor="middle" className="report-chart-axis-label">
                  {row.loadCount} load{row.loadCount === 1 ? '' : 's'}
                  {row.partial ? ' · partial' : ''}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="mt-2 text-xs text-[var(--text-muted)]">
        Click a month to see the loads behind it. Striped bars are months the selected range only partly covers.
      </p>

      {selected ? (
        <div className="mt-4 rounded-xl border border-[var(--border-color)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {selected.label} · {selected.loadCount} load{selected.loadCount === 1 ? '' : 's'}
              {selected.partial ? <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">(partial month)</span> : null}
            </p>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold tabular-nums text-[var(--text-primary)]">{formatCurrency(selected.revenueCents)}</span>
              <button type="button" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={() => setSelectedKey(null)}>
                Close
              </button>
            </div>
          </div>
          {selected.loads.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">No delivered or TONU loads this month.</p>
          ) : (
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-muted)] border-b border-[var(--border-color)]">
                    <th className="px-4 py-2 font-medium">Load #</th>
                    <th className="px-4 py-2 font-medium">PU #</th>
                    <th className="px-4 py-2 font-medium">Broker</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Counted on</th>
                    <th className="px-4 py-2 font-medium text-right">Gross</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {selected.loads.map((load) => (
                    <tr key={load.id}>
                      <td className="px-4 py-2 whitespace-nowrap font-medium text-[var(--brand-teal)]">{load.loadNumber}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-[var(--text-secondary)]">{load.puNumber || '—'}</td>
                      <td className="px-4 py-2 text-[var(--text-secondary)]">{load.brokerName}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-[var(--text-secondary)]">{load.status === 'TONU' ? 'TONU' : 'Delivered'}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-[var(--text-secondary)]">{formatUtcDay(load.revenueDate)}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-right font-semibold tabular-nums text-[var(--text-primary)]">
                        {formatCurrency(load.amountCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
