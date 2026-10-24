import type { Prisma } from '@prisma/client';

/** Highest `PREFIX-YYYY-NNNNN` sequence in `existing`, plus one. */
export function nextSequence(existing: (string | null)[], prefix: string): number {
  let max = 0;
  for (const value of existing) {
    if (!value?.startsWith(prefix)) continue;
    const seq = Number.parseInt(value.slice(prefix.length), 10);
    if (Number.isFinite(seq) && seq > max) max = seq;
  }
  return max + 1;
}

/**
 * Next statement number for the company, e.g. `SET-2026-00042`. Must run inside the transaction
 * that creates the statement: the advisory lock serialises concurrent creates for one company,
 * and numbering from the highest existing number means deleting a statement never frees its number.
 */
export async function nextStatementNumber(
  tx: Prisma.TransactionClient,
  kind: 'SET' | 'DSP',
  companyId: string,
): Promise<string> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`statement:${kind}:${companyId}`}))`;
  const prefix = `${kind}-${new Date().getFullYear()}-`;
  const where = { companyId, statementNumber: { startsWith: prefix } };
  const rows =
    kind === 'SET'
      ? await tx.settlement.findMany({ where, select: { statementNumber: true } })
      : await tx.dispatcherSettlement.findMany({ where, select: { statementNumber: true } });
  return `${prefix}${nextSequence(rows.map((r) => r.statementNumber), prefix).toString().padStart(5, '0')}`;
}
