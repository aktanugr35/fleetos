'use client';

import { useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import type { RevenueChartPoint } from '@/lib/dashboard-types';

interface MonthPoint {
  key: string;
  label: string;
  shortLabel: string;
  revenue: number;
}

function buildMonthlySeries(points: RevenueChartPoint[], monthCount = 6): MonthPoint[] {
  const revenueByKey = new Map<string, number>();
  for (const point of points) {
    const parsed = new Date(point.month);
    if (Number.isNaN(parsed.getTime())) continue;
    const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
    revenueByKey.set(key, point.revenue);
  }

  const now = new Date();
  const series: MonthPoint[] = [];
  for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    series.push({
      key,
      label: date.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
      shortLabel: date.toLocaleString('en-US', { month: 'short' }),
      revenue: revenueByKey.get(key) ?? 0,
    });
  }
  return series;
}

function formatAxisValue(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${Math.round(dollars / 1_000)}k`;
  return `$${Math.round(dollars)}`;
}

interface RevenueTrendChartProps {
  data: RevenueChartPoint[];
  monthCount?: number;
}

export function RevenueTrendChart({ data, monthCount = 6 }: RevenueTrendChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const series = useMemo(() => buildMonthlySeries(data, monthCount), [data, monthCount]);

  const maxRevenue = useMemo(
    () => Math.max(...series.map((m) => m.revenue), 1),
    [series],
  );

  const totalRevenue = useMemo(
    () => series.reduce((sum, m) => sum + m.revenue, 0),
    [series],
  );

  const hasDeliveredRevenue = data.length > 0 && totalRevenue > 0;

  const yTicks = useMemo(() => {
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => Math.round((maxRevenue / steps) * i));
  }, [maxRevenue]);

  const width = 480;
  const height = 220;
  const pad = { top: 16, right: 16, bottom: 36, left: 52 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const slotW = innerW / series.length;

  const points = series.map((month, i) => {
    const x = pad.left + slotW * i + slotW / 2;
    const y = pad.top + innerH - (month.revenue / maxRevenue) * innerH;
    return { ...month, x, y, index: i };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? pad.left} ${pad.top + innerH} L ${points[0]?.x ?? pad.left} ${pad.top + innerH} Z`;

  const active = activeIndex != null ? points[activeIndex] : null;

  return (
    <div className="revenue-trend-chart">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">6-month total</p>
          <p className="text-xl font-bold tracking-tight text-gray-100">{formatCurrency(totalRevenue)}</p>
          {!hasDeliveredRevenue ? (
            <p className="mt-1 text-xs text-gray-500">Delivered loads will populate this chart.</p>
          ) : null}
        </div>
        {active ? (
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-right">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">{active.label}</p>
            <p className="text-sm font-semibold text-blue-400">{formatCurrency(active.revenue)}</p>
          </div>
        ) : (
          <p className="text-xs text-gray-500">Hover a month for details</p>
        )}
      </div>

      <div className="revenue-trend-chart-panel rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 sm:p-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          role="img"
          aria-label="Monthly revenue trend chart"
        >
          <defs>
            <linearGradient id="revenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--fleetos-primary)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--fleetos-primary)" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="revenueBarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="var(--fleetos-primary)" />
            </linearGradient>
            <linearGradient id="revenueBarMuted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(59,130,246,0.45)" />
              <stop offset="100%" stopColor="rgba(59,130,246,0.18)" />
            </linearGradient>
          </defs>

          {yTicks.map((tick) => {
            const y = pad.top + innerH - (tick / maxRevenue) * innerH;
            return (
              <g key={tick}>
                <line
                  x1={pad.left}
                  y1={y}
                  x2={width - pad.right}
                  y2={y}
                  className="revenue-trend-grid-line"
                />
                <text x={pad.left - 8} y={y + 4} textAnchor="end" className="revenue-trend-axis-label">
                  {formatAxisValue(tick)}
                </text>
              </g>
            );
          })}

          <line
            x1={pad.left}
            y1={pad.top + innerH}
            x2={width - pad.right}
            y2={pad.top + innerH}
            className="revenue-trend-axis-line"
          />

          <path d={areaPath} fill="url(#revenueAreaGradient)" />
          <path
            d={linePath}
            fill="none"
            stroke="var(--fleetos-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point) => {
            const barW = Math.min(slotW * 0.42, 28);
            const barH = Math.max(3, (point.revenue / maxRevenue) * innerH);
            const barX = point.x - barW / 2;
            const barY = pad.top + innerH - barH;
            const isActive = activeIndex === point.index;
            const isLatest = point.index === points.length - 1;

            return (
              <g
                key={point.key}
                onMouseEnter={() => setActiveIndex(point.index)}
                onMouseLeave={() => setActiveIndex(null)}
                className="revenue-trend-month"
              >
                <rect
                  x={pad.left + slotW * point.index}
                  y={pad.top}
                  width={slotW}
                  height={innerH}
                  fill="transparent"
                />
                <rect
                  x={barX}
                  y={barY}
                  width={barW}
                  height={barH}
                  rx={6}
                  fill={isLatest ? 'url(#revenueBarGradient)' : 'url(#revenueBarMuted)'}
                  className={isActive ? 'revenue-trend-bar is-active' : 'revenue-trend-bar'}
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isActive ? 5 : 3.5}
                  className={isActive ? 'revenue-trend-dot is-active' : 'revenue-trend-dot'}
                />
                <text
                  x={point.x}
                  y={height - 12}
                  textAnchor="middle"
                  className={isActive ? 'revenue-trend-month-label is-active' : 'revenue-trend-month-label'}
                >
                  {point.shortLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
