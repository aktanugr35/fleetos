import type { PasswordCategory } from '@prisma/client';

export const PASSWORD_CATEGORY_LABELS: Record<PasswordCategory, string> = {
  PERMITS_TAX: 'Permits & Tax',
  LOAD_BOARDS: 'Load Boards',
  COMPLIANCE: 'Compliance',
  EMAIL: 'Email',
  OPERATIONS: 'Operations',
  OTHER: 'Other',
};

export function inferPasswordCategory(title: string, notes?: string | null): PasswordCategory {
  const haystack = `${title} ${notes ?? ''}`.toLowerCase();

  if (/ionos|webmail|e-?posta|email/.test(haystack)) return 'EMAIL';
  if (/fmcsa|clearinghouse|compliance|safer|drug test/.test(haystack)) return 'COMPLIANCE';
  if (/dat|relay|loadsmart|truckstop|rts|armada|load board|broker portal|loadboard/.test(haystack)) {
    return 'LOAD_BOARDS';
  }
  if (/permit|ifta|irp|kyu|taxation|oscar|tap|viim|dmv|decals/.test(haystack)) return 'PERMITS_TAX';
  if (/eld|motus|express|ringcentral|lab|toll|fuel/.test(haystack)) return 'OPERATIONS';

  return 'OTHER';
}
