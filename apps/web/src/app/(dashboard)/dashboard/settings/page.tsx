'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuthStore } from '@/store/authStore';
import { Toast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api-errors';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const { can } = usePermission();
  const canEditCompany = can('company:write');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Company Settings
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [commissionRate, setCommissionRate] = useState('12');
  const [companyFee, setCompanyFee] = useState('0');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoVersion, setLogoVersion] = useState(0);
  const [savingCompany, setSavingCompany] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    api.get('/companies/me').then(res => {
      const c = res.data.data;
      if (c) {
        setCompanyName(c.name || '');
        setCompanyAddress(c.address || '');
        setCompanyPhone(c.phone || '');
        setCommissionRate(c.defaultOOCommissionRate ? (c.defaultOOCommissionRate / 100).toString() : '12');
        setCompanyFee(c.weeklyCompanyFee ? (c.weeklyCompanyFee / 100).toFixed(2) : '0');
        setLogoUrl(c.logoUrl || null);
      }
    }).catch(() => {});
  }, []);

  const logoPreviewSrc = logoUrl ? `${API_BASE_URL}${logoUrl}?v=${logoVersion}` : null;

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await api.post('/companies/me/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLogoUrl(res.data.data.logoUrl || null);
      setLogoVersion((v) => v + 1);
      setToast({ type: 'success', message: 'Company logo uploaded!' });
    } catch {
      setToast({ type: 'error', message: 'Failed to upload logo' });
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    setUploadingLogo(true);
    try {
      await api.delete('/companies/me/logo');
      setLogoUrl(null);
      setLogoVersion((v) => v + 1);
      setToast({ type: 'success', message: 'Company logo removed' });
    } catch {
      setToast({ type: 'error', message: 'Failed to remove logo' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setToast({ type: 'error', message: 'New passwords do not match' });
      return;
    }
    setChangingPassword(true);
    try {
      await api.patch('/auth/me/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setToast({ type: 'success', message: 'Password updated successfully!' });
    } catch (err) {
      setToast({ type: 'error', message: getApiErrorMessage(err, 'Failed to update password') });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSaveCompany = async () => {
    setSavingCompany(true);
    try {
      await api.patch('/companies/me', {
        name: companyName,
        address: companyAddress,
        phone: companyPhone,
        defaultOOCommissionRate: Math.round(parseFloat(commissionRate) * 100),
        weeklyCompanyFee: Math.round(parseFloat(companyFee || '0') * 100),
      });
      setToast({ type: 'success', message: 'Company settings saved!' });
    } catch {
      setToast({ type: 'error', message: 'Failed to save settings' });
    } finally {
      setSavingCompany(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Company and account settings"
        actions={
          canEditCompany ? (
            <Link href="/dashboard/settings/team" className="btn btn-secondary text-sm">
              Manage Team Accounts
            </Link>
          ) : undefined
        }
      />

      <div className={`grid gap-6 ${canEditCompany ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-xl mx-auto lg:mx-0'}`}>
        {/* Company Settings */}
        {canEditCompany ? (
        <div className="card">
          <h3 className="font-semibold text-gray-200 mb-1 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Company Information
          </h3>
          <p className="text-xs text-gray-500 mb-4">This info appears on Settlement PDF statements</p>

          <div className="mb-6 pb-6 border-b border-[var(--border-color)]">
            <label className="block text-sm text-gray-400 mb-2">Company Logo</label>
            <p className="text-xs text-gray-500 mb-3">Shown on settlement statement PDFs (PNG, JPG, WEBP, GIF, or SVG, max 2MB)</p>
            <div className="flex flex-wrap items-start gap-4">
              <div className="w-36 h-20 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-center overflow-hidden">
                {logoPreviewSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreviewSrc} alt="Company logo" className="max-w-full max-h-full object-contain p-2" />
                ) : (
                  <span className="text-xs text-gray-500 text-center px-2">No logo</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleLogoUpload(file);
                  }}
                />
                <button
                  type="button"
                  disabled={uploadingLogo}
                  onClick={() => logoInputRef.current?.click()}
                  className="btn btn-secondary text-sm"
                >
                  {uploadingLogo ? 'Uploading...' : logoUrl ? 'Replace Logo' : 'Upload Logo'}
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    disabled={uploadingLogo}
                    onClick={() => void handleRemoveLogo()}
                    className="btn btn-secondary text-sm text-red-400 hover:text-red-300"
                  >
                    Remove Logo
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Company Name</label>
              <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Address</label>
              <input className="input" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="Address" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Phone</label>
              <input className="input" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="Phone number" />
            </div>
          </div>

          <div className="border-t border-[var(--border-color)] mt-6 pt-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-1">Weekly Company Fee</h4>
            <p className="text-xs text-gray-500 mb-3">Automatically added as a deduction on every new settlement statement</p>
            <div className="relative w-40">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input pl-7 text-right"
                value={companyFee}
                onChange={(e) => setCompanyFee(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="border-t border-[var(--border-color)] mt-6 pt-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-1">Commission Settings</h4>
            <p className="text-xs text-gray-500 mb-3">Default commission rate deducted from Owner Operator earnings</p>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  className="input w-28 pr-8 text-right"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
              <div className="flex-1 text-xs text-gray-500">
                Owner Operator receives <strong className="text-green-400">{(100 - parseFloat(commissionRate || '0')).toFixed(1)}%</strong> of the gross revenue
              </div>
            </div>
          </div>

          <button type="button" onClick={handleSaveCompany} disabled={savingCompany} className="btn btn-primary mt-4">
            {savingCompany ? 'Saving...' : 'Save Company Settings'}
          </button>
        </div>
        ) : null}

        {/* Profile */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Profile
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">First Name</label>
                  <input className="input" defaultValue={user?.firstName} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Last Name</label>
                  <input className="input" defaultValue={user?.lastName} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input className="input" defaultValue={user?.email} disabled />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Role</label>
                <input className="input" defaultValue={user?.role?.replace('_', ' ')} disabled />
              </div>
              <button className="btn btn-primary">Save Changes</button>
            </div>
          </div>

          {/* Security */}
          <div className="card">
            <h3 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Security
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Current Password</label>
                <input
                  type="password"
                  className="input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">New Password</label>
                <input
                  type="password"
                  className="input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Min 8 chars, upper, lower, number"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  className="input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <button
                type="button"
                disabled={changingPassword || !currentPassword || !newPassword}
                onClick={() => void handleChangePassword()}
                className="btn btn-secondary"
              >
                {changingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
