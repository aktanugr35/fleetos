export type ComplianceStatus = 'VALID' | 'DUE_SOON' | 'EXPIRED' | 'MISSING' | 'NA';
export type ComplianceEntityType = 'DRIVER' | 'TRUCK' | 'TRAILER' | 'COMPANY';
export type ComplianceTrackingMode = 'EXPIRY' | 'INTERVAL' | 'MILEAGE';

export interface ComplianceItem {
  id: string;
  recordId: string | null;
  persisted: boolean;
  complianceTypeId: string;
  typeKey: string;
  typeLabel: string;
  category: string;
  trackingMode: ComplianceTrackingMode;
  entityType: ComplianceEntityType;
  entityId: string | null;
  entityName: string;
  entitySubtitle: string | null;
  issuedDate: string | null;
  expiryDate: string | null;
  lastCompletedAt: string | null;
  nextDueAt: string | null;
  effectiveDate: string | null;
  referenceNumber: string | null;
  notes: string | null;
  documentId: string | null;
  status: ComplianceStatus;
  daysRemaining: number | null;
}

export interface ComplianceOverview {
  summary: {
    total: number;
    expired: number;
    dueSoon: number;
    dueWithin60: number;
    missing: number;
    valid: number;
    score: number;
  };
  categories: { category: string; total: number; issues: number }[];
  entities: Record<ComplianceEntityType, { total: number; issues: number }>;
  upcoming: ComplianceItem[];
}

export interface ComplianceSetting {
  complianceTypeId: string;
  key: string;
  label: string;
  category: string;
  entityType: ComplianceEntityType;
  trackingMode: ComplianceTrackingMode;
  description: string | null;
  defaultCadenceMonths: number | null;
  sortOrder: number;
  enabled: boolean;
  cadenceMonths: number | null;
  reminderDays: number[];
}

export const STATUS_META: Record<
  ComplianceStatus,
  { label: string; dot: string; text: string; chip: string }
> = {
  EXPIRED: {
    label: 'Expired',
    dot: 'bg-red-500',
    text: 'text-red-500',
    chip: 'bg-red-500/12 text-red-500 border-red-500/25',
  },
  DUE_SOON: {
    label: 'Due soon',
    dot: 'bg-amber-500',
    text: 'text-amber-500',
    chip: 'bg-amber-500/12 text-amber-600 border-amber-500/25',
  },
  MISSING: {
    label: 'Missing',
    dot: 'bg-slate-400',
    text: 'text-slate-400',
    chip: 'bg-slate-500/12 text-slate-400 border-slate-500/25',
  },
  VALID: {
    label: 'Valid',
    dot: 'bg-emerald-500',
    text: 'text-emerald-500',
    chip: 'bg-emerald-500/12 text-emerald-600 border-emerald-500/25',
  },
  NA: {
    label: 'N/A',
    dot: 'bg-slate-500',
    text: 'text-slate-500',
    chip: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  },
};

export const ENTITY_TABS: { key: ComplianceEntityType; label: string }[] = [
  { key: 'DRIVER', label: 'Drivers' },
  { key: 'TRUCK', label: 'Trucks' },
  { key: 'TRAILER', label: 'Trailers' },
  { key: 'COMPANY', label: 'Company' },
];

export function dueLabel(item: Pick<ComplianceItem, 'status' | 'daysRemaining'>): string {
  if (item.status === 'NA') return 'Not applicable';
  if (item.status === 'MISSING' || item.daysRemaining == null) return 'Not recorded';
  if (item.daysRemaining < 0) return `${Math.abs(item.daysRemaining)}d overdue`;
  if (item.daysRemaining === 0) return 'Due today';
  return `${item.daysRemaining}d left`;
}

/** Map a compliance type key to a Document type enum for uploads. */
export function documentTypeForKey(key: string): string {
  if (key.includes('CDL')) return 'CDL';
  if (key.includes('MEDICAL')) return 'MEDICAL_CARD';
  if (key.includes('DOT_INSPECTION')) return 'DOT_INSPECTION';
  if (key.includes('IRP')) return 'IRP_REGISTRATION';
  if (key.includes('2290')) return 'FORM_2290';
  if (key.includes('INSURANCE')) return 'INSURANCE_POLICY';
  return 'OTHER';
}

export function scoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-500';
  if (score >= 70) return 'text-amber-500';
  return 'text-red-500';
}
