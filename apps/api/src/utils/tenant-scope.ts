/**
 * Standard multi-tenant Prisma where clause — always scope by companyId.
 * Services return 404 (not 403) when a record exists in another tenant.
 */
export function tenantWhere<T extends Record<string, unknown>>(
  tenantId: string,
  extra?: T,
): T & { companyId: string } {
  return { ...(extra ?? ({} as T)), companyId: tenantId };
}
