export interface DashboardSummary {
  operational: {
    activeTrucks: number;
    activeDrivers: number;
    loads: Record<string, number>;
    complianceWarnings?: number;
  };
  financial: {
    monthlyRevenue: number;
  };
}

export interface RevenueChartPoint {
  month: string;
  revenue: number;
}

export interface DashboardLoadRow {
  id: string;
  loadNumber: string;
  status: string;
  pickupCity: string;
  pickupState: string;
  deliveryCity: string;
  deliveryState: string;
  totalRevenueCents?: number;
  driver?: { firstName: string; lastName: string } | null;
}

export type HeatBucket = 'hot' | 'warm' | 'cool' | 'cold';
export type HeatmapGranularity = 'month' | 'week';

export interface StateHeatRow {
  stateCode: string;
  loadCount: number;
  revenueCents: number;
  avgWaitDays: number;
  score: number;
  bucket: HeatBucket;
}

export interface StateHeatmapResponse {
  granularity: HeatmapGranularity;
  selectedPeriod: {
    key: string;
    label: string;
    start: string;
    endExclusive: string;
  };
  availablePeriods: Array<{ key: string; label: string }>;
  summary: {
    totalLoads: number;
    totalRevenueCents: number;
    statesWithLoads: number;
    averageWaitDays: number;
  };
  states: StateHeatRow[];
}
