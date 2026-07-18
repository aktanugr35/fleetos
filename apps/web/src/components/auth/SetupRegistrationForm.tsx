'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/lib/api-errors';
import api from '@/lib/api';

export function SetupRegistrationForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    dotNumber: '',
    mcNumber: '',
    companyAddress: '',
    companyPhone: '',
  });

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/setup', {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        companyName: form.companyName,
        dotNumber: form.dotNumber,
        mcNumber: form.mcNumber,
        companyAddress: form.companyAddress || undefined,
        companyPhone: form.companyPhone || undefined,
      });

      const { accessToken, user } = res.data.data;
      setAuth(user, accessToken);
      await router.refresh();
      router.push('/dashboard');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="animate-fade-in">
      <div className="card p-8 max-h-[85vh] overflow-y-auto">
        <div className="mb-6">
          <span
            className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full mb-3"
            style={{
              color: 'var(--brand-teal)',
              background: 'color-mix(in srgb, var(--brand-teal) 14%, transparent)',
              border: '1px solid color-mix(in srgb, var(--brand-teal) 32%, transparent)',
            }}
          >
            Get started
          </span>
          <h2 className="text-2xl font-bold">Create your account</h2>
          <p className="text-sm text-gray-500 mt-1">
            Register your company and administrator account to start running your fleet on Haulyard.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          <div>
            <h3 className="auth-section-title mb-3">Administrator</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">First name</label>
                <input className="input" required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Last name</label>
                <input className="input" required value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input type="email" className="input" required autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Password</label>
                <input type="password" className="input" required autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} />
                <p className="text-[10px] text-gray-500 mt-1">Min 8 chars, upper, lower, and a number</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Confirm</label>
                <input type="password" className="input" required autoComplete="new-password" value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="auth-section-title mb-3">Company</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Company name</label>
                <input className="input" required value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">DOT number</label>
                  <input className="input" required value={form.dotNumber} onChange={(e) => set('dotNumber', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">MC number</label>
                  <input className="input" required value={form.mcNumber} onChange={(e) => set('mcNumber', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Address (optional)</label>
                <input className="input" value={form.companyAddress} onChange={(e) => set('companyAddress', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Phone (optional)</label>
                <input className="input" value={form.companyPhone} onChange={(e) => set('companyPhone', e.target.value)} />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full py-3">
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
