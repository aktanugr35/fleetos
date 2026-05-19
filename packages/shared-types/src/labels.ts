import { CreditType, DeductionType } from './enums';

export const DEDUCTION_CATEGORY_LABELS: Record<DeductionType, string> = {
  [DeductionType.FUEL]: 'Fuel',
  [DeductionType.INSURANCE_ESCROW]: 'Insurance / Escrow',
  [DeductionType.CASH_ADVANCE]: 'Cash Advance',
  [DeductionType.MAINTENANCE]: 'Maintenance',
  [DeductionType.LUMPER]: 'Lumper',
  [DeductionType.TOLL]: 'Toll',
  [DeductionType.VIOLATION_FINE]: 'Violation Fine',
  [DeductionType.COMPANY_FEE]: 'Company Fee',
  [DeductionType.OTHER]: 'Other',
};

export const CREDIT_CATEGORY_LABELS: Record<CreditType, string> = {
  [CreditType.REIMBURSEMENT]: 'Reimbursement',
  [CreditType.BONUS]: 'Bonus',
  [CreditType.OTHER]: 'Other',
};

export function getDeductionCategoryLabel(type: DeductionType | string): string {
  return DEDUCTION_CATEGORY_LABELS[type as DeductionType] || type;
}

export function getCreditCategoryLabel(type: CreditType | string): string {
  return CREDIT_CATEGORY_LABELS[type as CreditType] || type;
}
