export const CREDIT_TYPE_LABELS: Record<string, string> = {
  REIMBURSEMENT: 'Reimbursement',
  BONUS: 'Bonus',
  OTHER: 'Other',
};

export interface CreditRecord {
  id: string;
  type: string;
  description: string;
  amount: number;
  isRecurring: boolean;
  date: string;
  driverId: string;
  driver: { id: string; firstName: string; lastName: string };
}

export function getCreditTypeLabel(type: string): string {
  return CREDIT_TYPE_LABELS[type] || type;
}

export function toDateInputValue(iso: string): string {
  return iso.split('T')[0];
}
