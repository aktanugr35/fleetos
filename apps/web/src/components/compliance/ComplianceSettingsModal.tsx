'use client';

import { useEffect, useState, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import api from '@/lib/api';
import { logErrorDev } from '@/lib/logger';
import { getApiErrorMessage } from '@/lib/api-errors';
import { type ComplianceSetting, ENTITY_TABS } from '@/lib/compliance';

interface Props {
  onClose: () => void;
  onChanged: () => void;
}

export function ComplianceSettingsModal({ onClose, onChanged }: Props) {
  const [settings, setSettings] = useState<ComplianceSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/compliance/settings');
      setSettings(res.data.data.settings);
    } catch (err) {
      logErrorDev('compliance-settings', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (
    s: ComplianceSetting,
    data: Partial<Pick<ComplianceSetting, 'enabled' | 'cadenceMonths' | 'reminderDays'>>,
  ) => {
    setSavingId(s.complianceTypeId);
    setError(null);
    const prev = settings;
    setSettings((cur) =>
      cur.map((x) => (x.complianceTypeId === s.complianceTypeId ? { ...x, ...data } : x)),
    );
    try {
      await api.patch(`/compliance/settings/${s.complianceTypeId}`, data);
      onChanged();
    } catch (err) {
      logErrorDev('compliance-setting-patch', err);
      setError(getApiErrorMessage(err, 'Failed to update setting'));
      setSettings(prev);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Compliance settings"
      description="Choose which requirements your company tracks, cadence and reminder schedule."
      size="xl"
    >
      {loading ? (
        <LoadingBlock rows={8} />
      ) : (
        <div className="space-y-6">
          {error && <p className="text-sm text-red-500">{error}</p>}
          {ENTITY_TABS.map((tab) => {
            const group = settings.filter((s) => s.entityType === tab.key);
            if (group.length === 0) return null;
            return (
              <div key={tab.key}>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {tab.label}
                </h4>
                <div className="overflow-hidden rounded-lg border border-[var(--border-color)]">
                  {group.map((s, idx) => (
                    <div
                      key={s.complianceTypeId}
                      className={`flex flex-wrap items-center gap-3 px-3 py-2.5 ${
                        idx > 0 ? 'border-t border-[var(--border-color)]' : ''
                      } ${s.enabled ? '' : 'opacity-60'}`}
                    >
                      <label className="flex flex-1 items-center gap-3 cursor-pointer min-w-0">
                        <input
                          type="checkbox"
                          checked={s.enabled}
                          disabled={savingId === s.complianceTypeId}
                          onChange={(e) => void patch(s, { enabled: e.target.checked })}
                          className="h-4 w-4 accent-[var(--brand-amber)]"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-[var(--text-primary)]">
                            {s.label}
                          </span>
                          <span className="block truncate text-xs text-[var(--text-muted)]">
                            {s.category}
                            {s.description ? ` · ${s.description}` : ''}
                          </span>
                        </span>
                      </label>

                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                        <span>Every</span>
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={s.cadenceMonths ?? ''}
                          placeholder="—"
                          disabled={savingId === s.complianceTypeId}
                          onChange={(e) =>
                            void patch(s, {
                              cadenceMonths: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          className="w-14 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 py-1 text-center text-[var(--text-primary)]"
                        />
                        <span>mo</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
