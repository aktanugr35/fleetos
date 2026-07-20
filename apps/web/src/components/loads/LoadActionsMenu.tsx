'use client';

import { useEffect, useRef, useState } from 'react';
import { LOAD_STATUS_META, type LoadListItem, type LoadStatus } from '@/lib/loads';

const CHANGEABLE: LoadStatus[] = ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'TONU'];

interface Props {
  load: LoadListItem;
  canDispatch: boolean;
  canDelete: boolean;
  updating: boolean;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: LoadStatus) => void;
}

export function LoadActionsMenu({
  load,
  canDispatch,
  canDelete,
  updating,
  deleting,
  onEdit,
  onDelete,
  onStatusChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!canDispatch && !canDelete) {
    return <span className="text-xs text-[var(--text-muted)]">—</span>;
  }

  const showStatus = canDispatch && load.status !== 'CANCELLED';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={updating || deleting}
        className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
        aria-label="Load actions"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 min-w-[10rem] rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] py-1 shadow-xl">
          {canDispatch && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="block w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              Edit load
            </button>
          )}
          {showStatus && (
            <>
              <div className="my-1 border-t border-[var(--border-color)]" />
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Set status
              </div>
              {CHANGEABLE.filter((s) => s !== load.status).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onStatusChange(s);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                >
                  {LOAD_STATUS_META[s].label}
                </button>
              ))}
            </>
          )}
          {canDelete && (
            <>
              <div className="my-1 border-t border-[var(--border-color)]" />
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
                className="block w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10"
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
