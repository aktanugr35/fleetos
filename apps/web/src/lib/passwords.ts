export type PasswordCategory =
  | 'PERMITS_TAX'
  | 'LOAD_BOARDS'
  | 'COMPLIANCE'
  | 'EMAIL'
  | 'OPERATIONS'
  | 'OTHER';

export interface CompanyPassword {
  id: string;
  title: string;
  category: PasswordCategory;
  url: string | null;
  username: string | null;
  password: string;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const PASSWORD_CATEGORY_LABELS: Record<PasswordCategory, string> = {
  PERMITS_TAX: 'Permits & Tax',
  LOAD_BOARDS: 'Load Boards',
  COMPLIANCE: 'Compliance',
  EMAIL: 'Email',
  OPERATIONS: 'Operations',
  OTHER: 'Other',
};

export const PASSWORD_CATEGORIES: PasswordCategory[] = [
  'PERMITS_TAX',
  'LOAD_BOARDS',
  'COMPLIANCE',
  'EMAIL',
  'OPERATIONS',
  'OTHER',
];

export interface PasswordFormValues {
  title: string;
  category: PasswordCategory;
  url: string;
  username: string;
  password: string;
  notes: string;
}

export const EMPTY_PASSWORD_FORM: PasswordFormValues = {
  title: '',
  category: 'OTHER',
  url: '',
  username: '',
  password: '',
  notes: '',
};

export async function copyText(value: string, label: string): Promise<string> {
  await navigator.clipboard.writeText(value);
  return `${label} copied`;
}
