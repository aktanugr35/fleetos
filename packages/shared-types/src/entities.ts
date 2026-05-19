import type { CreditType, DeductionType, SettlementStatus } from './enums';

export interface DriverRef {
  id: string;
  firstName: string;
  lastName: string;
}

export interface DeductionFuelMetadata {
  grossAmount?: number;
  discount?: number;
  merchant?: string;
  gallons?: number;
}

export interface DeductionRecord {
  id: string;
  type: DeductionType;
  description: string;
  amount: number;
  isRecurring: boolean;
  date: string;
  driverId: string;
  metadata?: DeductionFuelMetadata | null;
  driver: DriverRef;
  settlementDeductions?: Array<{ id: string }>;
  _count?: { settlementDeductions: number };
}

export interface CreditRecord {
  id: string;
  type: CreditType;
  description: string;
  amount: number;
  isRecurring: boolean;
  date: string;
  driverId: string;
  driver: DriverRef;
  settlementCredits?: Array<{ id: string }>;
  _count?: { settlementCredits: number };
}

export function isDeductionApplied(
  record: Pick<DeductionRecord, 'settlementDeductions' | '_count'>
): boolean {
  if (record._count?.settlementDeductions) return record._count.settlementDeductions > 0;
  return (record.settlementDeductions?.length ?? 0) > 0;
}

export function isCreditApplied(
  record: Pick<CreditRecord, 'settlementCredits' | '_count'>
): boolean {
  if (record._count?.settlementCredits) return record._count.settlementCredits > 0;
  return (record.settlementCredits?.length ?? 0) > 0;
}

export interface SettlementSummary {
  id: string;
  statementNumber: string | null;
  status: SettlementStatus;
  periodStart: string;
  periodEnd: string;
  grossAmount: number;
  deductionTotal: number;
  creditTotal: number;
  netAmount: number;
  pdfUrl: string | null;
  driver: DriverRef & { driverType?: string };
  lines?: Array<{ id: string; description: string; netAmount: number }>;
  deductions?: Array<{ amount: number; deduction: { type: string; description: string } }>;
  credits?: Array<{ amount: number; credit: { type: string; description: string } }>;
  createdAt?: string;
  _count?: { lines: number; deductions: number; credits: number };
}
