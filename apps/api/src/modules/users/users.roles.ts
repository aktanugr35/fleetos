import { UserRole } from '@prisma/client';

/** Roles a company admin may assign when creating or updating team accounts. */
export const COMPANY_ASSIGNABLE_ROLES: UserRole[] = [
  UserRole.COMPANY_ADMIN,
  UserRole.DISPATCHER,
  UserRole.ACCOUNTING,
  UserRole.DRIVER,
];

export function isCompanyAssignableRole(role: string): role is UserRole {
  return (COMPANY_ASSIGNABLE_ROLES as string[]).includes(role);
}

export function assertCompanyAssignableRole(role: string): UserRole {
  if (!isCompanyAssignableRole(role)) {
    throw new Error(`INVALID_ROLE:${role}`);
  }
  return role;
}
