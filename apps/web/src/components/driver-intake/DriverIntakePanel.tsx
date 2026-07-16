'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { formatDateTimeAmPm } from '@/lib/utils';

interface IntakeStatus {
  submitted: boolean;
  submittedAt: string | null;
  documentId: string | null;
  pendingLink: { url: string; expiresAt: string } | null;
}

interface Props {
  driverId: string;
}

export function DriverIntakePanel({ driverId }: Props) {
  const [status, setStatus] = useState<IntakeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/drivers/${driverId}/intake-status`);
      setStatus(res.data.data);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load application status'));
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    void load();
  }, [load]);

  const generateLink = async () => {
    setGenerating(true);
    setError(null);
    try {
      await api.post(`/drivers/${driverId}/intake-link`);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not create link'));
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = async () => {
    const url = status?.pendingLink?.url;
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadApplication = async () => {
    if (!status?.documentId) return;
    setError(null);
    try {
      const res = await api.get(`/documents/${status.documentId}/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'driver_application.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not download PDF'));
    }
  };

  if (loading) {
    return (
      <div className="card animate-pulse h-32" />
    );
  }

  return (
    <div className="card mb-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-semibold text-gray-200">DOT Driver Application</h3>
          <p className="text-xs text-gray-500 mt-1">
            Send a shareable link so the driver can complete the application online. Submitted forms are saved as PDF.
          </p>
        </div>
        {status?.submitted ? (
          <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Submitted
          </span>
        ) : status?.pendingLink ? (
          <span className="text-xs px-2 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Pending
          </span>
        ) : (
          <span className="text-xs px-2 py-1 rounded-full bg-gray-500/15 text-gray-400 border border-gray-500/30">
            Not sent
          </span>
        )}
      </div>

      {error ? (
        <div className="mb-3 text-sm text-red-400 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30">{error}</div>
      ) : null}

      {status?.submitted ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            Application received {status.submittedAt ? formatDateTimeAmPm(status.submittedAt) : ''}.
          </p>
          <button type="button" className="btn btn-secondary text-sm" onClick={downloadApplication}>
            Download PDF
          </button>
        </div>
      ) : status?.pendingLink ? (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              readOnly
              value={status.pendingLink.url}
              className="input flex-1 text-xs font-mono"
            />
            <button type="button" className="btn btn-primary text-sm shrink-0" onClick={copyLink}>
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Expires {formatDateTimeAmPm(status.pendingLink.expiresAt)}
          </p>
          <button type="button" className="text-xs text-blue-400 hover:text-blue-300" onClick={generateLink} disabled={generating}>
            {generating ? 'Generating…' : 'Generate new link'}
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-primary text-sm" onClick={generateLink} disabled={generating}>
          {generating ? 'Creating link…' : 'Create application link'}
        </button>
      )}
    </div>
  );
}
