export type AccountingEntryKind = 'EXPENSE' | 'INCOME';

export interface AccountingCategory {
  key: string;
  label: string;
}

/**
 * Manually entered costs. Fuel cards, tolls, driver and dispatcher pay and factoring fees are
 * pulled from the rest of the app, so they have no category here.
 */
export const EXPENSE_CATEGORIES: AccountingCategory[] = [
  { key: 'TRUCK_PAYMENT', label: 'Truck / trailer payment & lease' },
  { key: 'REPAIRS', label: 'Repairs & maintenance' },
  { key: 'TIRES', label: 'Tires' },
  { key: 'INSURANCE', label: 'Insurance' },
  { key: 'PERMITS', label: 'Permits, IRP, IFTA & 2290' },
  { key: 'FUEL_OTHER', label: 'Fuel (not on a fuel card)' },
  { key: 'PARKING', label: 'Parking' },
  { key: 'ELD_SOFTWARE', label: 'ELD, GPS & software' },
  { key: 'OFFICE', label: 'Office, phone & internet' },
  { key: 'OFFICE_PAYROLL', label: 'Office payroll' },
  { key: 'PROFESSIONAL', label: 'Accounting & legal' },
  { key: 'TAXES', label: 'Taxes' },
  { key: 'BANK_FEES', label: 'Bank & card fees' },
  { key: 'OTHER_EXPENSE', label: 'Other expense' },
];

export const INCOME_CATEGORIES: AccountingCategory[] = [
  { key: 'REFUND', label: 'Refund / rebate' },
  { key: 'DEPOSIT_RETURN', label: 'Escrow / deposit return' },
  { key: 'OTHER_INCOME', label: 'Other income' },
];

export const PAYMENT_METHODS: AccountingCategory[] = [
  { key: 'ACH', label: 'ACH / bank transfer' },
  { key: 'CARD', label: 'Credit / debit card' },
  { key: 'CHECK', label: 'Check' },
  { key: 'ZELLE', label: 'Zelle' },
  { key: 'CASH', label: 'Cash' },
  { key: 'OTHER', label: 'Other' },
];

export function accountingCategories(kind: AccountingEntryKind): AccountingCategory[] {
  return kind === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function accountingCategoryLabel(key: string): string {
  return (
    [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find((c) => c.key === key)?.label ?? key
  );
}

export function paymentMethodLabel(key: string | null | undefined): string {
  if (!key) return '—';
  return PAYMENT_METHODS.find((m) => m.key === key)?.label ?? key;
}
