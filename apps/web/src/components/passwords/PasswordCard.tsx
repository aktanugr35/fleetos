'use client';

import type { CompanyPassword } from '@/lib/passwords';
import { PASSWORD_CATEGORY_LABELS } from '@/lib/passwords';

interface PasswordCardProps {
  entry: CompanyPassword;
  onOpen: (entry: CompanyPassword) => void;
}

export function PasswordCard({ entry, onOpen }: PasswordCardProps) {
  const usernamePreview = entry.username
    ? entry.username.length > 36
      ? `${entry.username.slice(0, 36)}…`
      : entry.username
    : 'No login saved';

  return (
    <button
      type="button"
      onClick={() => onOpen(entry)}
      className="card text-left w-full hover:border-[var(--accent)]/40 transition group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-[var(--text-primary)] truncate">{entry.title}</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1 truncate">{usernamePreview}</p>
        </div>
        <span className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
          {PASSWORD_CATEGORY_LABELS[entry.category]}
        </span>
      </div>

      {entry.notes && (
        <p className="text-xs text-[var(--text-muted)] mt-3 line-clamp-2">{entry.notes}</p>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>{entry.url ? 'Portal link saved' : 'No link'}</span>
        <span className="text-[var(--accent)] opacity-0 group-hover:opacity-100 transition">View details</span>
      </div>
    </button>
  );
}
