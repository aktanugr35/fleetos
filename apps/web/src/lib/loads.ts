export type LoadStatus = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'TONU' | 'CANCELLED';

export type StatusFilter = '' | 'ACTIVE' | LoadStatus;

export interface LoadListItem {
  id: string;
  loadNumber: string;
  status: LoadStatus;
  brokerName: string;
  pickupCity: string;
  pickupState: string;
  deliveryCity: string;
  deliveryState: string;
  pickupDate: string;
  deliveryDate: string;
  miles: number;
  totalRevenueCents: number;
  driver: { id: string; firstName: string; lastName: string } | null;
  truck: { id: string; unitNumber: string } | null;
}

export interface LoadStats {
  pending: number;
  inTransit: number;
  delivered: number;
  totalRevenueCents: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export const LOAD_STATUS_META: Record<
  LoadStatus,
  { label: string; chip: string; dot: string }
> = {
  PENDING: {
    label: 'Pending',
    chip: 'bg-amber-500/12 text-amber-600 border-amber-500/25',
    dot: 'bg-amber-500',
  },
  IN_TRANSIT: {
    label: 'In Transit',
    chip: 'bg-[color-mix(in_srgb,var(--brand-teal)_18%,transparent)] text-[var(--brand-teal)] border-[color-mix(in_srgb,var(--brand-teal)_35%,transparent)]',
    dot: 'bg-[var(--brand-teal)]',
  },
  DELIVERED: {
    label: 'Delivered',
    chip: 'bg-emerald-500/12 text-emerald-600 border-emerald-500/25',
    dot: 'bg-emerald-500',
  },
  TONU: {
    label: 'TONU',
    chip: 'bg-[color-mix(in_srgb,var(--brand-amber)_15%,transparent)] text-[var(--brand-amber)] border-[color-mix(in_srgb,var(--brand-amber)_30%,transparent)]',
    dot: 'bg-[var(--brand-amber)]',
  },
  CANCELLED: {
    label: 'Cancelled',
    chip: 'bg-red-500/12 text-red-500 border-red-500/25',
    dot: 'bg-red-500',
  },
};

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'TONU', label: 'TONU' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: '', label: 'All' },
];

export type DatePreset = 'week' | 'month' | 'all';

export function dateRangeForPreset(preset: DatePreset): { dateFrom?: string; dateTo?: string } {
  if (preset === 'all') return {};
  const now = new Date();
  if (preset === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
}

export function buildLoadQueryParams(opts: {
  statusFilter: StatusFilter;
  driverId: string;
  search: string;
  datePreset: DatePreset;
  page: number;
  limit: number;
}): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: opts.page,
    limit: opts.limit,
  };
  if (opts.statusFilter === 'ACTIVE') {
    params.activeOnly = 'true';
  } else if (opts.statusFilter) {
    params.status = opts.statusFilter;
  }
  if (opts.driverId) params.driverId = opts.driverId;
  if (opts.search.trim()) params.search = opts.search.trim();
  const range = dateRangeForPreset(opts.datePreset);
  if (range.dateFrom) params.dateFrom = range.dateFrom;
  if (range.dateTo) params.dateTo = range.dateTo;
  return params;
}

export interface DriverGroup {
  driverId: string;
  driverName: string;
  loads: LoadListItem[];
  totalRevenueCents: number;
  totalMiles: number;
}

export function groupLoadsByDriver(loads: LoadListItem[]): DriverGroup[] {
  const map = new Map<string, DriverGroup>();
  for (const load of loads) {
    const driverId = load.driver?.id ?? '__unassigned__';
    const driverName = load.driver
      ? `${load.driver.firstName} ${load.driver.lastName}`
      : 'Unassigned';
    let group = map.get(driverId);
    if (!group) {
      group = { driverId, driverName, loads: [], totalRevenueCents: 0, totalMiles: 0 };
      map.set(driverId, group);
    }
    group.loads.push(load);
    group.totalRevenueCents += load.totalRevenueCents;
    group.totalMiles += load.miles ?? 0;
  }
  return [...map.values()].sort((a, b) => a.driverName.localeCompare(b.driverName));
}

export function formatRoute(load: Pick<LoadListItem, 'pickupCity' | 'pickupState' | 'deliveryCity' | 'deliveryState'>): string {
  return `${load.pickupCity}, ${load.pickupState} → ${load.deliveryCity}, ${load.deliveryState}`;
}
