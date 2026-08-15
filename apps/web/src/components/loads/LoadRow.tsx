'use client';

import { formatCurrency, formatDateTimeAmPm } from '@/lib/utils';
import { formatRoute, formatRouteWithStops, type LoadListItem, type LoadStatus } from '@/lib/loads';
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
  const stopCount = load.stopCount ?? load.stops?.length ?? 0;

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
          <span className="text-sm text-[var(--text-secondary)]">
            {load.brokerName}
            {load.brokerAgent ? ` · ${load.brokerAgent.name}` : ''}
          </span>
          {load.puNumber && (
            <span className="text-xs text-[var(--text-muted)]">PU# {load.puNumber}</span>
          )}
          {!compact && <LoadStatusBadge status={load.status} />}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm">
          <span className="font-medium text-[var(--text-primary)]" title={stopCount > 0 ? formatRouteWithStops(load) : undefined}>
            {formatRoute(load)}
          </span>
          {stopCount > 0 && (
            <span className="rounded-full border border-[color-mix(in_srgb,var(--brand-amber)_30%,transparent)] bg-[color-mix(in_srgb,var(--brand-amber)_15%,transparent)] px-2 py-0.5 text-xs font-medium text-[var(--brand-amber)]">
              +{stopCount} stop{stopCount > 1 ? 's' : ''}
            </span>
          )}
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
