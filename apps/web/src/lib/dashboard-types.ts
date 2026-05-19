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
