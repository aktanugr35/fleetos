'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { formatCurrency } from '@/lib/utils';

export interface MonthlyGrossPoint {
  monthKey: string;
  label: string;
  revenueCents: number;
}

/** Round the axis ceiling up to a readable number so the gridlines land on round money. */
function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function formatAxisValue(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${Math.round(dollars / 1_000)}k`;
  return `$${Math.round(dollars)}`;
}

const HEIGHT = 280;
const PAD = { top: 18, right: 18, bottom: 38, left: 62 };

/**
 * Tracks the rendered width so the viewBox can use CSS pixels 1:1. A fixed viewBox would
 * letterboxthe plot on wide screens, which is what hid the bars before.
 */
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

export function MonthlyGrossChart({ data }: { data: MonthlyGrossPoint[] }) {
  const chartId = useId().replace(/:/g, '');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const { ref: panelRef, width: measuredWidth } = useMeasuredWidth();
  const WIDTH = Math.max(measuredWidth, 320);

  const total = useMemo(
    () => data.reduce((sum, row) => sum + row.revenueCents, 0),
    [data],
  );
  const peak = useMemo(
    () => data.reduce((best, row) => (row.revenueCents > best.revenueCents ? row : best), data[0]),
    [data],
  );
  const axisMax = useMemo(
    () => niceCeiling(Math.max(...data.map((row) => row.revenueCents), 1)),
    [data],
  );

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const baseline = PAD.top + innerH;
  const slotW = innerW / data.length;
  const barW = Math.min(slotW * 0.52, 64);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => fraction * axisMax);
  // Drop every other month name once the labels would start colliding.
  const labelStride = slotW < 58 ? 2 : 1;

  const active = activeIndex == null ? null : data[activeIndex];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Range total
          </p>
          <p className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            {formatCurrency(total)}
          </p>
        </div>
        {active ? (
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-right">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
              {active.label}
            </p>
            <p className="text-sm font-semibold text-[var(--haulyard-primary)]">
              {formatCurrency(active.revenueCents)}
            </p>
          </div>
        ) : peak && peak.revenueCents > 0 ? (
          <p className="text-xs text-[var(--text-muted)]">
            Best month: <span className="font-medium text-[var(--text-secondary)]">{peak.label}</span>{' '}
            ({formatCurrency(peak.revenueCents)})
          </p>
        ) : null}
      </div>

      <div ref={panelRef} className="report-chart-panel rounded-xl border border-[var(--border-color)] p-3 sm:p-4">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="xMinYMin meet"
          className="report-chart-svg"
          role="img"
          aria-label="Delivered gross revenue by pickup month"
        >
          <defs>
            <linearGradient id={`${chartId}-bar`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: 'var(--haulyard-primary)', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: 'var(--haulyard-primary)', stopOpacity: 0.62 }} />
            </linearGradient>
            <linearGradient id={`${chartId}-bar-muted`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: 'var(--haulyard-secondary)', stopOpacity: 0.85 }} />
              <stop offset="100%" style={{ stopColor: 'var(--haulyard-secondary)', stopOpacity: 0.5 }} />
            </linearGradient>
          </defs>

          {ticks.map((tick) => {
            const y = baseline - (tick / axisMax) * innerH;
            return (
              <g key={tick}>
                <line x1={PAD.left} y1={y} x2={WIDTH - PAD.right} y2={y} className="report-chart-grid" />
                <text x={PAD.left - 10} y={y + 4} textAnchor="end" className="report-chart-axis-label">
                  {formatAxisValue(tick)}
                </text>
              </g>
            );
          })}

          <line
            x1={PAD.left}
            y1={baseline}
            x2={WIDTH - PAD.right}
            y2={baseline}
            className="report-chart-axis"
          />

          {data.map((row, index) => {
            const slotX = PAD.left + slotW * index;
            const centerX = slotX + slotW / 2;
            const barH = row.revenueCents > 0 ? Math.max(3, (row.revenueCents / axisMax) * innerH) : 0;
            const isActive = activeIndex === index;
            const isPeak = peak != null && row.monthKey === peak.monthKey && row.revenueCents > 0;

            return (
              <g
                key={row.monthKey}
                className="report-chart-slot"
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onTouchStart={() => setActiveIndex(index)}
              >
                {isActive ? (
                  <rect
                    x={slotX + 2}
                    y={PAD.top}
                    width={slotW - 4}
                    height={innerH}
                    rx={8}
                    className="report-chart-band"
                  />
                ) : null}
                <rect x={slotX} y={PAD.top} width={slotW} height={innerH} fill="transparent" />

                {barH > 0 ? (
                  <rect
                    x={centerX - barW / 2}
                    y={baseline - barH}
                    width={barW}
                    height={barH}
                    rx={7}
                    fill={isPeak || isActive ? `url(#${chartId}-bar)` : `url(#${chartId}-bar-muted)`}
                    className={isActive ? 'report-chart-bar is-active' : 'report-chart-bar'}
                  />
                ) : null}

                {isActive ? (
                  <text
                    x={centerX}
                    y={baseline - barH - 9}
                    textAnchor="middle"
                    className="report-chart-value"
                  >
                    {formatCurrency(row.revenueCents)}
                  </text>
                ) : null}

                {index % labelStride === 0 ? (
                  <text
                    x={centerX}
                    y={HEIGHT - 14}
                    textAnchor="middle"
                    className={isActive ? 'report-chart-month is-active' : 'report-chart-month'}
                  >
                    {row.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
