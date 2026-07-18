'use client';

import { useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { FormField, FormInput, FormTextarea } from '@/components/ui/FormElements';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { logErrorDev } from '@/lib/logger';
import {
  type ComplianceItem,
  documentTypeForKey,
  dueLabel,
} from '@/lib/compliance';

interface RenewModalProps {
  item: ComplianceItem;
  onClose: () => void;
  onSaved: () => void;
}

function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RenewModal({ item, onClose, onSaved }: RenewModalProps) {
  const isExpiry = item.trackingMode === 'EXPIRY';
  const [primaryDate, setPrimaryDate] = useState<string>(
    item.expiryDate?.slice(0, 10) || (isExpiry ? '' : todayInput()),
  );
  const [issuedDate, setIssuedDate] = useState<string>(item.issuedDate?.slice(0, 10) || '');
  const [referenceNumber, setReferenceNumber] = useState<string>(item.referenceNumber || '');
  const [notes, setNotes] = useState<string>(item.notes || '');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entityLinkField =
    item.entityType === 'DRIVER'
      ? 'driverId'
      : item.entityType === 'TRUCK'
        ? 'truckId'
        : item.entityType === 'TRAILER'
          ? 'trailerId'
          : null;

  const uploadDocument = async (): Promise<string | undefined> => {
    if (!file) return undefined;
    const form = new FormData();
    form.append('file', file);
    form.append('type', documentTypeForKey(item.typeKey));
    form.append('title', `${item.typeLabel} — ${item.entityName}`);
    if (entityLinkField && item.entityId) form.append(entityLinkField, item.entityId);
    if (primaryDate && isExpiry) form.append('expiryDate', primaryDate);
    const res = await api.post('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.id as string;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpiry && !primaryDate) {
      setError('Please enter an expiry date.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const documentId = await uploadDocument();
      await api.post('/compliance/records', {
        typeKey: item.typeKey,
        entityType: item.entityType,
        entityId: item.entityId,
        ...(isExpiry
          ? { expiryDate: primaryDate }
          : { completedAt: primaryDate || todayInput() }),
        ...(issuedDate && { issuedDate }),
        ...(referenceNumber && { referenceNumber }),
        ...(notes && { notes }),
        ...(documentId && { documentId }),
      });
      onSaved();
    } catch (err) {
      logErrorDev('compliance-renew', err);
      setError(getApiErrorMessage(err, 'Failed to save compliance record'));
    } finally {
      setSaving(false);
    }
  };

  const handleMarkNa = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post('/compliance/records/mark-na', {
        typeKey: item.typeKey,
        entityType: item.entityType,
        entityId: item.entityId,
      });
      onSaved();
    } catch (err) {
      logErrorDev('compliance-na', err);
      setError(getApiErrorMessage(err, 'Failed to mark not applicable'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={item.persisted ? `Renew — ${item.typeLabel}` : `Record — ${item.typeLabel}`}
      description={`${item.entityName}${item.entitySubtitle ? ` · ${item.entitySubtitle}` : ''}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {item.persisted && (
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-secondary)]">
            Current: <span className="font-medium text-[var(--text-primary)]">{dueLabel(item)}</span>
            {item.lastCompletedAt && (
              <span className="ml-2 text-[var(--text-muted)]">
                · last done {new Date(item.lastCompletedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        <FormField
          label={isExpiry ? 'New expiry date' : 'Completed on'}
          required={isExpiry}
        >
          <FormInput
            type="date"
            value={primaryDate}
            onChange={(e) => setPrimaryDate(e.target.value)}
          />
          {!isExpiry && item.trackingMode !== 'MILEAGE' && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Next due date is calculated automatically from the configured cadence.
            </p>
          )}
        </FormField>

        {isExpiry && (
          <FormField label="Issued date (optional)">
            <FormInput
              type="date"
              value={issuedDate}
              onChange={(e) => setIssuedDate(e.target.value)}
            />
          </FormField>
        )}

        <FormField label="Reference / permit number (optional)">
          <FormInput
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="e.g. permit #, decal #, query ref"
          />
        </FormField>

        <FormField label="Attach document (optional)">
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--bg-elevated)] file:px-3 file:py-2 file:text-sm file:text-[var(--text-primary)] hover:file:bg-[var(--bg-secondary)]"
          />
        </FormField>

        <FormField label="Notes (optional)">
          <FormTextarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </FormField>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <ModalFooter>
          <button
            type="button"
            onClick={handleMarkNa}
            disabled={saving}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition sm:mr-auto"
          >
            Mark not applicable
          </button>
          <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : item.persisted ? 'Save renewal' : 'Save record'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
