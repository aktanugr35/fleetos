'use client';

import { formatCurrency, formatDateTimeAmPm } from '@/lib/utils';
import { formatRoute, type LoadListItem, type LoadStatus } from '@/lib/loads';
import { LoadStatusBadge } from './LoadStatusBadge';
import { LoadActionsMenu } from './LoadActionsMenu';

interface Props {
  load: LoadListItem;
  canDispatch: boolean;
  canDelete: boolean;
  updating: boolean;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: LoadStatus) => void;
  onSelect?: () => void;
  /** Hide driver/truck line (used inside driver groups). */
  compact?: boolean;
}

export function LoadRow({
  load,
  canDispatch,
  canDelete,
  updating,
  deleting,
  onEdit,
  onDelete,
  onStatusChange,
  onSelect,
  compact = false,
}: Props) {
  return (
    <div
      className={`group flex items-center gap-3 border-b border-[var(--border-color)] px-4 py-3 transition last:border-b-0 hover:bg-[var(--surface-hover)] ${
        load.status === 'CANCELLED' ? 'opacity-60' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <button
            type="button"
            onClick={onSelect}
            className="font-semibold text-[var(--brand-teal)] hover:underline"
          >
            {load.loadNumber}
          </button>
          <span className="text-sm text-[var(--text-secondary)]">{load.brokerName}</span>
          {!compact && <LoadStatusBadge status={load.status} />}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm">
          <span className="font-medium text-[var(--text-primary)]">{formatRoute(load)}</span>
          <span className="text-[var(--text-muted)]">·</span>
          <span className="text-[var(--text-muted)]">{(load.miles ?? 0).toLocaleString()} mi</span>
        </div>

        {!compact && (
          <div className="mt-0.5 text-xs text-[var(--text-muted)]">
            {load.driver ? `${load.driver.firstName} ${load.driver.lastName}` : 'No driver'}
            {load.truck ? ` · Unit ${load.truck.unitNumber}` : ''}
            {' · Pickup '}
            {formatDateTimeAmPm(load.pickupDate)}
          </div>
        )}
        {compact && (
          <div className="mt-0.5 text-xs text-[var(--text-muted)]">
            Pickup {formatDateTimeAmPm(load.pickupDate)}
            {load.truck ? ` · Unit ${load.truck.unitNumber}` : ''}
          </div>
        )}
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <div className="font-semibold text-[var(--text-primary)]">
          {formatCurrency(load.totalRevenueCents)}
        </div>
        {compact && (
          <div className="mt-1 flex justify-end">
            <LoadStatusBadge status={load.status} />
          </div>
        )}
      </div>

      <div className="shrink-0 sm:hidden">
        <div className="text-sm font-semibold text-[var(--text-primary)]">
          {formatCurrency(load.totalRevenueCents)}
        </div>
      </div>

      <LoadActionsMenu
        load={load}
        canDispatch={canDispatch}
        canDelete={canDelete}
        updating={updating}
        deleting={deleting}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
      />
    </div>
  );
}
