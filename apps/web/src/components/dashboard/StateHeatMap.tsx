'use client';

import { useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import type { HeatBucket, HeatmapGranularity, StateHeatmapResponse } from '@/lib/dashboard-types';

interface TileState {
  code: string;
  name: string;
  col: number;
  row: number;
}

const STATE_TILES: TileState[] = [
  { code: 'AK', name: 'Alaska', col: 0, row: 6 },
  { code: 'HI', name: 'Hawaii', col: 1, row: 7 },
  { code: 'WA', name: 'Washington', col: 0, row: 0 },
  { code: 'OR', name: 'Oregon', col: 0, row: 1 },
  { code: 'CA', name: 'California', col: 0, row: 2 },
  { code: 'ID', name: 'Idaho', col: 1, row: 1 },
  { code: 'NV', name: 'Nevada', col: 1, row: 2 },
  { code: 'UT', name: 'Utah', col: 2, row: 2 },
  { code: 'AZ', name: 'Arizona', col: 2, row: 3 },
  { code: 'MT', name: 'Montana', col: 2, row: 0 },
  { code: 'WY', name: 'Wyoming', col: 3, row: 1 },
  { code: 'CO', name: 'Colorado', col: 3, row: 2 },
  { code: 'NM', name: 'New Mexico', col: 3, row: 3 },
  { code: 'ND', name: 'North Dakota', col: 4, row: 0 },
  { code: 'SD', name: 'South Dakota', col: 4, row: 1 },
  { code: 'NE', name: 'Nebraska', col: 4, row: 2 },
  { code: 'KS', name: 'Kansas', col: 4, row: 3 },
  { code: 'OK', name: 'Oklahoma', col: 4, row: 4 },
  { code: 'TX', name: 'Texas', col: 4, row: 5 },
  { code: 'MN', name: 'Minnesota', col: 5, row: 0 },
  { code: 'IA', name: 'Iowa', col: 5, row: 2 },
  { code: 'MO', name: 'Missouri', col: 5, row: 3 },
  { code: 'AR', name: 'Arkansas', col: 5, row: 4 },
  { code: 'LA', name: 'Louisiana', col: 5, row: 5 },
  { code: 'WI', name: 'Wisconsin', col: 6, row: 1 },
  { code: 'IL', name: 'Illinois', col: 6, row: 2 },
  { code: 'KY', name: 'Kentucky', col: 6, row: 3 },
  { code: 'TN', name: 'Tennessee', col: 6, row: 4 },
  { code: 'MS', name: 'Mississippi', col: 6, row: 5 },
  { code: 'MI', name: 'Michigan', col: 7, row: 1 },
  { code: 'IN', name: 'Indiana', col: 7, row: 2 },
  { code: 'OH', name: 'Ohio', col: 8, row: 2 },
  { code: 'WV', name: 'West Virginia', col: 8, row: 3 },
  { code: 'AL', name: 'Alabama', col: 7, row: 5 },
  { code: 'GA', name: 'Georgia', col: 8, row: 5 },
  { code: 'FL', name: 'Florida', col: 9, row: 6 },
  { code: 'SC', name: 'South Carolina', col: 9, row: 5 },
  { code: 'NC', name: 'North Carolina', col: 9, row: 4 },
  { code: 'VA', name: 'Virginia', col: 9, row: 3 },
  { code: 'PA', name: 'Pennsylvania', col: 9, row: 2 },
  { code: 'NY', name: 'New York', col: 10, row: 1 },
  { code: 'VT', name: 'Vermont', col: 11, row: 0 },
  { code: 'NH', name: 'New Hampshire', col: 11, row: 1 },
  { code: 'ME', name: 'Maine', col: 12, row: 0 },
  { code: 'MA', name: 'Massachusetts', col: 11, row: 2 },
  { code: 'CT', name: 'Connecticut', col: 11, row: 3 },
  { code: 'RI', name: 'Rhode Island', col: 12, row: 3 },
  { code: 'NJ', name: 'New Jersey', col: 10, row: 3 },
  { code: 'DE', name: 'Delaware', col: 10, row: 4 },
  { code: 'MD', name: 'Maryland', col: 9, row: 4.4 },
  { code: 'DC', name: 'District of Columbia', col: 10, row: 4.5 },
];

const LEGEND: Array<{ label: string; bucket: HeatBucket | 'none' }> = [
  { label: 'No data', bucket: 'none' },
  { label: 'Cold', bucket: 'cold' },
  { label: 'Cool', bucket: 'cool' },
  { label: 'Warm', bucket: 'warm' },
  { label: 'Hot', bucket: 'hot' },
];

function bucketClass(bucket: HeatBucket | 'none'): string {
  switch (bucket) {
    case 'hot':
      return 'state-heat-tile hot';
    case 'warm':
      return 'state-heat-tile warm';
    case 'cool':
      return 'state-heat-tile cool';
    case 'cold':
      return 'state-heat-tile cold';
    default:
      return 'state-heat-tile none';
  }
}

interface StateHeatMapProps {
  data: StateHeatmapResponse | null;
  granularity: HeatmapGranularity;
  onGranularityChange: (value: HeatmapGranularity) => void;
  onPeriodChange: (periodKey: string) => void;
  loading?: boolean;
}

export function StateHeatMap({
  data,
  granularity,
  onGranularityChange,
  onPeriodChange,
  loading = false,
}: StateHeatMapProps) {
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const metricsByState = useMemo(
    () => new Map((data?.states ?? []).map((row) => [row.stateCode, row])),
    [data?.states],
  );

  const hoveredTile = hoveredCode
    ? STATE_TILES.find((tile) => tile.code === hoveredCode) ?? null
    : null;
  const hoveredMetrics = hoveredCode ? metricsByState.get(hoveredCode) : undefined;

  const tileW = 26;
  const tileH = 18;
  const gap = 4;
  const width = 13 * (tileW + gap) + 20;
  const height = 8 * (tileH + gap) + 20;

  return (
    <div>
      <div className="dashboard-heatmap-toolbar">
        <div className="dashboard-heatmap-controls">
          <select
            value={granularity}
            onChange={(e) => onGranularityChange(e.target.value as HeatmapGranularity)}
            className="input h-9 py-1 text-xs min-w-[7.5rem]"
          >
            <option value="month">Monthly</option>
            <option value="week">Weekly</option>
          </select>
          <select
            value={data?.selectedPeriod.key ?? ''}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="input h-9 py-1 text-xs min-w-[10rem]"
            disabled={!data}
          >
            {(data?.availablePeriods ?? []).map((period) => (
              <option key={period.key} value={period.key}>
                {period.label}
              </option>
            ))}
          </select>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Selected period</p>
          <p className="text-xs font-medium text-gray-200">{data?.selectedPeriod.label ?? '—'}</p>
        </div>
      </div>

      {loading || !data ? (
        <div className="dashboard-heatmap-placeholder">Loading heat map...</div>
      ) : (
        <>
          <div className="dashboard-heatmap-summary">
            <div>
              <p className="summary-label">Loads</p>
              <p className="summary-value">{data.summary.totalLoads}</p>
            </div>
            <div>
              <p className="summary-label">Revenue</p>
              <p className="summary-value">{formatCurrency(data.summary.totalRevenueCents)}</p>
            </div>
            <div>
              <p className="summary-label">Avg wait</p>
              <p className="summary-value">{data.summary.averageWaitDays.toFixed(1)}d</p>
            </div>
            <div>
              <p className="summary-label">Active states</p>
              <p className="summary-value">{data.summary.statesWithLoads}</p>
            </div>
          </div>

          <div className="dashboard-state-heatmap-wrap">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto"
              role="img"
              aria-label="US pickup-state heat map"
            >
              {STATE_TILES.map((tile) => {
                const x = 10 + tile.col * (tileW + gap);
                const y = 10 + tile.row * (tileH + gap);
                const metrics = metricsByState.get(tile.code);
                const bucket = metrics?.bucket ?? 'none';
                return (
                  <g
                    key={tile.code}
                    onMouseEnter={() => setHoveredCode(tile.code)}
                    onMouseLeave={() => setHoveredCode(null)}
                    className="state-heat-cell"
                  >
                    <rect
                      x={x}
                      y={y}
                      width={tileW}
                      height={tileH}
                      rx={5}
                      className={bucketClass(bucket)}
                    />
                    <text
                      x={x + tileW / 2}
                      y={y + tileH / 2 + 3}
                      textAnchor="middle"
                      className="state-heat-code"
                    >
                      {tile.code}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="dashboard-heatmap-legend">
            {LEGEND.map((item) => (
              <div key={item.label} className="legend-item">
                <span className={bucketClass(item.bucket)} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="dashboard-heatmap-tooltip">
            {hoveredTile ? (
              hoveredMetrics ? (
                <>
                  <p className="font-semibold text-gray-100">
                    {hoveredTile.name} ({hoveredTile.code})
                  </p>
                  <p className="text-gray-400">Score: {hoveredMetrics.score.toFixed(1)}</p>
                  <p className="text-gray-400">Loads: {hoveredMetrics.loadCount}</p>
                  <p className="text-gray-400">Revenue: {formatCurrency(hoveredMetrics.revenueCents)}</p>
                  <p className="text-gray-400">Avg wait: {hoveredMetrics.avgWaitDays.toFixed(1)} days</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-gray-100">
                    {hoveredTile.name} ({hoveredTile.code})
                  </p>
                  <p className="text-gray-500">No loads in this period.</p>
                </>
              )
            ) : (
              <p className="text-gray-500">Hover a state tile to inspect metrics.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
