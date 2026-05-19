import { UserRole } from './enums';

/**
 * FleetOS permission keys — keep in sync with API route RBAC and web UI gates.
 * See walkthrough Faz 8 role matrix.
 */
export type FleetPermission =
  | 'fleet:dashboard'
  | 'company:write'
  | 'drivers:list'
  | 'drivers:write'
  | 'equipment:view'
  | 'equipment:write'
  | 'loads:list'
  | 'loads:dispatch'
  | 'loads:cancel'
  | 'loads:stats'
  | 'compliance:view'
  | 'reports:view'
  | 'settlements:list'
  | 'settlements:create'
  | 'settlements:finalize'
  | 'financial:list'
  | 'financial:write';

/** Office staff (excludes DRIVER portal users) */
export const STAFF_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.COMPANY_ADMIN,
  UserRole.DISPATCHER,
  UserRole.ACCOUNTING,
];

/**
 * Role × permission matrix (SUPER_ADMIN is always allowed via roleHasPermission).
 *
 * | Area          | SUPER | ADMIN | DISPATCH | ACCT | DRIVER |
 * |---------------|-------|-------|----------|------|--------|
 * | Loads write   | ✓     | ✓     | ✓        | —    | —      |
 * | Loads read    | ✓     | ✓     | ✓        | ✓    | own    |
 * | Settlements   | ✓     | ✓     | read     | ✓    | own    |
 * | Drivers write | ✓     | ✓     | —        | —    | —      |
 * | Settings      | ✓     | ✓     | —        | —    | —      |
 */
export const FLEET_RBAC_MATRIX: Record<FleetPermission, UserRole[]> = {
  'fleet:dashboard': STAFF_ROLES,
  'company:write': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN],
  'drivers:list': [...STAFF_ROLES, UserRole.DRIVER],
  'drivers:write': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN],
  'equipment:view': STAFF_ROLES,
  'equipment:write': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN],
  'loads:list': [...STAFF_ROLES, UserRole.DRIVER],
  'loads:dispatch': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.DISPATCHER],
  'loads:cancel': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN],
  'loads:stats': STAFF_ROLES,
  'compliance:view': STAFF_ROLES,
  'reports:view': STAFF_ROLES,
  'settlements:list': [...STAFF_ROLES, UserRole.DRIVER],
  'settlements:create': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.ACCOUNTING],
  'settlements:finalize': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.ACCOUNTING],
  'financial:write': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.ACCOUNTING],
  'financial:list': [...STAFF_ROLES, UserRole.DRIVER],
};

export function roleHasPermission(
  role: UserRole | string | undefined,
  permission: FleetPermission,
): boolean {
  if (!role) return false;
  if (role === UserRole.SUPER_ADMIN) return true;
  return FLEET_RBAC_MATRIX[permission].includes(role as UserRole);
}
