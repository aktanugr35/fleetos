'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LOAD_STATUS_META, type LoadListItem, type LoadStatus } from '@/lib/loads';

const CHANGEABLE: LoadStatus[] = ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'TONU'];

/** Layout effects only exist in the browser; the server render must not warn. */
const useMeasureEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

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
  // The list card clips its children, so the menu is portaled to the body and
  // positioned against the button instead of nested inside the row.
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [dropUp, setDropUp] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = anchor !== null;

  useMeasureEffect(() => {
    if (!anchor || !menuRef.current) return;
    const spaceBelow = window.innerHeight - anchor.bottom;
    setDropUp(spaceBelow < menuRef.current.offsetHeight + 16);
  }, [anchor]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setAnchor(null);
    };
    const dismiss = () => setAnchor(null);
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [open]);

  if (!canDispatch && !canDelete) {
    return <span className="text-xs text-[var(--text-muted)]">—</span>;
  }

  const showStatus = canDispatch && load.status !== 'CANCELLED';

  const menu = anchor ? (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: dropUp ? anchor.top - 4 : anchor.bottom + 4,
        right: Math.max(8, window.innerWidth - anchor.right),
        transform: dropUp ? 'translateY(-100%)' : undefined,
      }}
      className="z-50 min-w-[10rem] rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] py-1 shadow-xl"
    >
      {canDispatch && (
        <button
          type="button"
          onClick={() => {
            setAnchor(null);
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
                setAnchor(null);
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
              setAnchor(null);
              onDelete();
            }}
            className="block w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10"
          >
            Delete
          </button>
        </>
      )}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() =>
          setAnchor((current) =>
            current ? null : (buttonRef.current?.getBoundingClientRect() ?? null),
          )
        }
        disabled={updating || deleting}
        className="shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
        aria-label="Load actions"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {menu ? createPortal(menu, document.body) : null}
    </>
  );
}
