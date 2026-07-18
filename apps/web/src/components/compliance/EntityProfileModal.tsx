'use client';

import { useEffect, useState, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import api from '@/lib/api';
import { logErrorDev } from '@/lib/logger';
import { formatDate } from '@/lib/utils';
import {
  type ComplianceItem,
  type ComplianceEntityType,
  STATUS_META,
  dueLabel,
} from '@/lib/compliance';
import { RenewModal } from './RenewModal';

interface EntityProfileModalProps {
  entityType: ComplianceEntityType;
  entityId: string;
  entityName: string;
  onClose: () => void;
  onChanged: () => void;
}

export function EntityProfileModal({
  entityType,
  entityId,
  entityName,
  onClose,
  onChanged,
}: EntityProfileModalProps) {
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState<ComplianceItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/compliance/entity/${entityType}/${entityId}`);
      setItems(res.data.data.items);
    } catch (err) {
      logErrorDev('compliance-entity', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = items.reduce<Record<string, ComplianceItem[]>>((acc, item) => {
    (acc[item.category] ||= []).push(item);
    return acc;
  }, {});

  return (
    <>
      <Modal isOpen onClose={onClose} title={entityName} description="Compliance profile" size="lg">
        {loading ? (
          <LoadingBlock rows={6} />
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped).map(([category, catItems]) => (
              <div key={category}>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {category}
                </h4>
                <div className="space-y-1.5">
                  {catItems.map((item) => {
                    const meta = STATUS_META[item.status];
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2.5"
                      >
                        <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-[var(--text-primary)]">
                            {item.typeLabel}
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">
                            {item.effectiveDate ? formatDate(item.effectiveDate) : '—'}
                            {item.referenceNumber ? ` · ${item.referenceNumber}` : ''}
                          </div>
                        </div>
                        <span className={`shrink-0 text-xs font-medium ${meta.text}`}>
                          {dueLabel(item)}
                        </span>
                        <button
                          onClick={() => setRenewing(item)}
                          className="shrink-0 rounded-md border border-[var(--border-color)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--brand-amber)] hover:text-[var(--text-primary)]"
                        >
                          {item.persisted ? 'Renew' : 'Record'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {renewing && (
        <RenewModal
          item={renewing}
          onClose={() => setRenewing(null)}
          onSaved={() => {
            setRenewing(null);
            void load();
            onChanged();
          }}
        />
      )}
    </>
  );
}
