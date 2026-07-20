'use client';

import { LOAD_STATUS_META, type LoadStatus } from '@/lib/loads';

export function LoadStatusBadge({ status }: { status: LoadStatus | string }) {
  const meta = LOAD_STATUS_META[status as LoadStatus] ?? LOAD_STATUS_META.PENDING;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
