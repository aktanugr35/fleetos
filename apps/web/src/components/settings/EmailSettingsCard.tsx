'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { formatDateTimeAmPm } from '@/lib/utils';

interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  fromEmail: string;
  fromName: string | null;
  replyTo: string | null;
  factoringEmail: string | null;
  inHouseFinanceEmail: string | null;
  hasPassword: boolean;
  lastTestedAt: string | null;
  lastTestError: string | null;
}

const PRESETS: { id: string; label: string; host: string; port: number; secure: boolean; hint?: string }[] = [
  { id: 'gmail', label: 'Gmail / Google Workspace', host: 'smtp.gmail.com', port: 587, secure: false, hint: 'Use a Google App Password, not your normal password.' },
  { id: 'outlook', label: 'Outlook / Microsoft 365', host: 'smtp.office365.com', port: 587, secure: false },
  { id: 'yahoo', label: 'Yahoo', host: 'smtp.mail.yahoo.com', port: 465, secure: true, hint: 'Use a Yahoo app password.' },
  { id: 'zoho', label: 'Zoho Mail', host: 'smtp.zoho.com', port: 465, secure: true },
];

const emptyForm = {
  smtpHost: '',
  smtpPort: '587',
  smtpSecure: false,
  smtpUser: '',
  smtpPassword: '',
  fromEmail: '',
  fromName: '',
  replyTo: '',
  factoringEmail: '',
  inHouseFinanceEmail: '',
};

type Notify = (type: 'success' | 'error', message: string) => void;

export function EmailSettingsCard({ notify }: { notify: Notify }) {
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<EmailSettings | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const [removing, setRemoving] = useState(false);

  const applySaved = (settings: EmailSettings | null) => {
    setSaved(settings);
    setForm(
      settings
        ? {
            smtpHost: settings.smtpHost,
            smtpPort: String(settings.smtpPort),
            smtpSecure: settings.smtpSecure,
            smtpUser: settings.smtpUser,
            smtpPassword: '',
            fromEmail: settings.fromEmail,
            fromName: settings.fromName ?? '',
            replyTo: settings.replyTo ?? '',
            factoringEmail: settings.factoringEmail ?? '',
            inHouseFinanceEmail: settings.inHouseFinanceEmail ?? '',
          }
        : emptyForm,
    );
  };

  useEffect(() => {
    api
      .get('/companies/me/email-settings')
      .then((res) => applySaved(res.data.data?.settings ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const applyPreset = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setForm((prev) => ({ ...prev, smtpHost: preset.host, smtpPort: String(preset.port), smtpSecure: preset.secure }));
  };

  const activePreset = PRESETS.find((p) => p.host === form.smtpHost.trim().toLowerCase());
  const canSave =
    form.smtpHost.trim() &&
    form.smtpPort &&
    form.smtpUser.trim() &&
    form.fromEmail.trim() &&
    (saved?.hasPassword || form.smtpPassword);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/companies/me/email-settings', {
        smtpHost: form.smtpHost.trim(),
        smtpPort: Number(form.smtpPort),
        smtpSecure: form.smtpSecure,
        smtpUser: form.smtpUser.trim(),
        ...(form.smtpPassword ? { smtpPassword: form.smtpPassword } : {}),
        fromEmail: form.fromEmail.trim(),
        fromName: form.fromName.trim() || null,
        replyTo: form.replyTo.trim() || null,
        factoringEmail: form.factoringEmail.trim() || null,
        inHouseFinanceEmail: form.inHouseFinanceEmail.trim() || null,
      });
      applySaved(res.data.data?.settings ?? null);
      notify('success', 'Email settings saved. Send a test email to check them.');
    } catch (err) {
      notify('error', getApiErrorMessage(err, 'Could not save email settings'));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await api.post('/companies/me/email-settings/test', { to: testTo.trim() });
      notify('success', `Test email sent to ${testTo.trim()}`);
      const res = await api.get('/companies/me/email-settings');
      setSaved(res.data.data?.settings ?? null);
    } catch (err) {
      notify('error', getApiErrorMessage(err, 'Test email failed'));
      const res = await api.get('/companies/me/email-settings').catch(() => null);
      if (res) setSaved(res.data.data?.settings ?? null);
    } finally {
      setTesting(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await api.delete('/companies/me/email-settings');
      applySaved(null);
      notify('success', 'Email settings removed');
    } catch (err) {
      notify('error', getApiErrorMessage(err, 'Could not remove email settings'));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
        <h3 className="font-semibold text-gray-200 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>
          Email (SMTP)
        </h3>
        {saved ? (
          saved.lastTestError ? (
            <span className="px-2 py-0.5 text-[11px] rounded-full bg-red-500/15 text-red-400 border border-red-500/30">Last test failed</span>
          ) : saved.lastTestedAt ? (
            <span className="px-2 py-0.5 text-[11px] rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Working</span>
          ) : (
            <span className="px-2 py-0.5 text-[11px] rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">Not tested yet</span>
          )
        ) : (
          <span className="px-2 py-0.5 text-[11px] rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/30">Not set up</span>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-4">
        The mail server Haulyard uses to send emails from your company address. The password is stored encrypted.
      </p>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Email provider</label>
            <select className="input" value={activePreset?.id ?? 'custom'} onChange={(e) => applyPreset(e.target.value)}>
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
              <option value="custom">Other (enter server details)</option>
            </select>
            {activePreset?.hint ? <p className="text-xs text-amber-400/90 mt-1">{activePreset.hint}</p> : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label className="block text-sm text-gray-400 mb-1">SMTP server</label>
              <input className="input" value={form.smtpHost} onChange={(e) => set('smtpHost', e.target.value)} placeholder="smtp.example.com" autoComplete="off" />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm text-gray-400 mb-1">Port</label>
              <input className="input" type="number" min="1" max="65535" value={form.smtpPort} onChange={(e) => set('smtpPort', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Security</label>
              <select className="input" value={form.smtpSecure ? 'ssl' : 'starttls'} onChange={(e) => set('smtpSecure', e.target.value === 'ssl')}>
                <option value="starttls">STARTTLS (587)</option>
                <option value="ssl">SSL/TLS (465)</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-sm text-gray-400 mb-1">Username</label>
              <input className="input" value={form.smtpUser} onChange={(e) => set('smtpUser', e.target.value)} placeholder="Usually your full email address" autoComplete="off" />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <input
                className="input"
                type="password"
                value={form.smtpPassword}
                onChange={(e) => set('smtpPassword', e.target.value)}
                placeholder={saved?.hasPassword ? '•••••••• saved — leave blank to keep' : 'SMTP / app password'}
                autoComplete="new-password"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-sm text-gray-400 mb-1">From email</label>
              <input className="input" type="email" value={form.fromEmail} onChange={(e) => set('fromEmail', e.target.value)} placeholder="billing@yourcompany.com" />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-sm text-gray-400 mb-1">From name <span className="text-gray-600">(optional)</span></label>
              <input className="input" value={form.fromName} onChange={(e) => set('fromName', e.target.value)} placeholder="Your company name" />
            </div>
            <div className="sm:col-span-6">
              <label className="block text-sm text-gray-400 mb-1">Reply-to <span className="text-gray-600">(optional)</span></label>
              <input className="input" type="email" value={form.replyTo} onChange={(e) => set('replyTo', e.target.value)} placeholder="Where replies should go, if different" />
            </div>
          </div>

          <div className="border-t border-[var(--border-color)] mt-6 pt-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-1">Invoice notification recipients</h4>
            <p className="text-xs text-gray-500 mb-3">
              When you submit a load on the Factoring page, the invoice email goes to the address for the option you picked.
              Separate several addresses with commas.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Factoring company email</label>
                <input className="input" value={form.factoringEmail} onChange={(e) => set('factoringEmail', e.target.value)} placeholder="invoices@factoringcompany.com" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">In-house finance email</label>
                <input className="input" value={form.inHouseFinanceEmail} onChange={(e) => set('inHouseFinanceEmail', e.target.value)} placeholder="accounting@yourcompany.com" />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" disabled={saving || !canSave} onClick={() => void handleSave()}>
              {saving ? 'Saving...' : 'Save Email Settings'}
            </button>
            {saved ? (
              <button type="button" className="btn btn-secondary text-red-400 hover:text-red-300" disabled={removing} onClick={() => void handleRemove()}>
                Remove
              </button>
            ) : null}
          </div>

          {saved ? (
            <div className="border-t border-[var(--border-color)] mt-6 pt-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-1">Send a test email</h4>
              <p className="text-xs text-gray-500 mb-3">
                {saved.lastTestedAt
                  ? `Last test ${formatDateTimeAmPm(saved.lastTestedAt)}${saved.lastTestError ? ' failed.' : ' succeeded.'}`
                  : 'Check that the settings above work before relying on them.'}
              </p>
              {saved.lastTestError ? (
                <p className="text-xs text-red-400 mb-3 break-words">{saved.lastTestError}</p>
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row">
                <input className="input flex-1" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="recipient@example.com" />
                <button type="button" className="btn btn-secondary" disabled={testing || !testTo.trim()} onClick={() => void handleTest()}>
                  {testing ? 'Sending...' : 'Send Test Email'}
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
