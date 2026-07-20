'use client';

import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getInitials } from '@/lib/utils';
import api from '@/lib/api';
import { useState, useRef, useEffect } from 'react';
import { TenantSwitcher } from '@/components/layout/TenantSwitcher';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { SearchInput } from '@/components/ui/SearchInput';
import { useSidebar } from '@/components/layout/DashboardShell';

export function Header() {
  const { user, clearAuth } = useAuthStore();
  const { mobileOpen, setMobileOpen } = useSidebar();
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    clearAuth();
    router.push('/login');
  };

  const initials = user ? getInitials(user.firstName, user.lastName) : 'U';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/95 px-3 backdrop-blur sm:h-16 sm:px-6">
      <button
        type="button"
        aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={mobileOpen}
        className="lg:hidden p-2 rounded-lg hover-surface text-[var(--text-secondary)] shrink-0"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <div className="flex-1 max-w-md hidden sm:block">
        <SearchInput
          placeholder="Search drivers, trucks, loads..."
          className="py-2 text-sm bg-[var(--bg-primary)]"
        />
      </div>

      <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-3">
        <div className="hidden sm:block">
          <TenantSwitcher />
        </div>
        <ThemeToggle />
        <NotificationBell />

        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 p-1.5 rounded-lg hover-surface transition"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, var(--brand-teal), var(--brand-midnight-2))' }}
            >
              {initials}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showProfileMenu ? (
            <div className="absolute right-0 top-12 w-56 card p-1 animate-fade-in shadow-xl z-50">
              <Link
                href="/dashboard/settings"
                onClick={() => setShowProfileMenu(false)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover-surface rounded-lg transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4" />
                </svg>
                Settings
              </Link>
              <div className="my-1 border-t border-[var(--border-color)]" />
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
