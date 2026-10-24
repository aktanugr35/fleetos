'use client';

export interface PageMeta {
  page: number;
  totalPages: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Prev / Next bar under a list; hidden when everything fits on one page. */
export function Pagination({
  meta,
  noun,
  onPageChange,
}: {
  meta: PageMeta | null | undefined;
  /** Singular label for the count, e.g. "driver". */
  noun: string;
  onPageChange: (page: number) => void;
}) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-[var(--text-muted)]">
      <span>
        {meta.total} {noun}
        {meta.total === 1 ? '' : 's'} · page {meta.page} of {meta.totalPages}
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={!meta.hasPrev}
          onClick={() => onPageChange(Math.max(1, meta.page - 1))}
          className="btn-secondary px-3 py-1 disabled:opacity-40"
        >
          Prev
        </button>
        <button
          type="button"
          disabled={!meta.hasNext}
          onClick={() => onPageChange(meta.page + 1)}
          className="btn-secondary px-3 py-1 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
