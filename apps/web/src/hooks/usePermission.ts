import { useMemo } from 'react';
import {
  roleHasPermission,
  type FleetPermission,
} from '@fleetos/shared-types';
import { useAuthStore } from '@/store/authStore';

export type { FleetPermission };

/** Single permission gate (preferred for JSX: `can('equipment:write')`) */
export function usePermission() {
  const role = useAuthStore((s) => s.user?.role);
  return useMemo(
    () => ({
      role,
      can: (permission: FleetPermission) => roleHasPermission(role, permission),
    }),
    [role],
  );
}
