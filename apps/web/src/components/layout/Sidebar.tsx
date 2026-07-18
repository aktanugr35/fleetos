'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BrandWordmark } from '@/components/layout/BrandWordmark';
import type { FleetPermission } from '@/hooks/usePermission';
import { usePermission } from '@/hooks/usePermission';
import { useSidebar } from '@/components/layout/DashboardShell';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  permission: FleetPermission;
  badge?: number;
}

const navigation: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    permission: 'fleet:dashboard',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: 'Drivers',
    href: '/dashboard/drivers',
    permission: 'drivers:list',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'Dispatchers',
    href: '/dashboard/dispatchers',
    permission: 'dispatchers:list',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 11h-6" /><path d="M18 8v6" />
      </svg>
    ),
  },
  {
    label: 'Trucks',
    href: '/dashboard/trucks',
    permission: 'equipment:view',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 17h4V5H2v12h3" /><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
        <circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
      </svg>
    ),
  },
  {
    label: 'Trailers',
    href: '/dashboard/trailers',
    permission: 'equipment:view',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="6" width="20" height="12" rx="2" /><circle cx="6" cy="18" r="2" /><circle cx="16" cy="18" r="2" />
        <path d="M21 12h2" />
      </svg>
    ),
  },
  {
    label: 'Loads',
    href: '/dashboard/loads',
    permission: 'loads:list',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    label: 'Compliance',
    href: '/dashboard/compliance',
    permission: 'compliance:view',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    label: 'Settlements',
    href: '/dashboard/settlements',
    permission: 'settlements:list',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    label: 'Dispatcher Pay',
    href: '/dashboard/dispatcher-settlements',
    permission: 'dispatcher-settlements:list',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
  },
  {
    label: 'Deductions',
    href: '/dashboard/deductions',
    permission: 'financial:list',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    label: 'Fuel/Toll',
    href: '/dashboard/fuel-toll',
    permission: 'financial:list',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 22V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v17" />
        <path d="M14 9h2a2 2 0 0 1 2 2v8a3 3 0 0 0 6 0v-7a2 2 0 0 0-.59-1.41L20 7" />
        <path d="M7 7h3" />
      </svg>
    ),
  },
  {
    label: 'Credits',
    href: '/dashboard/credits',
    permission: 'financial:list',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    label: 'Reports',
    href: '/dashboard/reports',
    permission: 'reports:view',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

const bottomNavigation: NavItem[] = [
  {
    label: 'Settings',
    href: '/dashboard/settings',
    permission: 'company:write',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

const mobilePrimaryRoutes = new Set([
  '/dashboard',
  '/dashboard/loads',
  '/dashboard/drivers',
  '/dashboard/settlements',
  '/dashboard/settings',
]);

export function Sidebar() {
  const pathname = usePathname();
  const { can } = usePermission();
  const { mobileOpen, closeMobile } = useSidebar();

  const filteredNav = navigation.filter((item) => can(item.permission));
  const filteredBottom = bottomNavigation.filter((item) => can(item.permission));

  return (
    <aside
      className={cn(
        'app-sidebar fixed left-0 top-0 h-screen w-64 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col z-40 transition-transform duration-200 ease-out',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}
    >
      <div className="h-16 flex items-center gap-3 px-5 border-b border-[var(--border-color)]">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--brand-midnight-2), var(--brand-teal))' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" style={{ color: 'var(--brand-amber)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 17h4V5H2v12h3" /><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
            <circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
          </svg>
        </div>
        <BrandWordmark className="text-lg" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobile}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'text-gray-400 hover:text-gray-200 hover-surface',
              )}
            >
              <span className={cn(isActive ? 'text-blue-400' : 'text-gray-500')}>{item.icon}</span>
              {item.label}
              {item.badge ? (
                <span className="ml-auto bg-red-500/20 text-red-400 text-xs font-medium px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 border-t border-[var(--border-color)] pt-4 space-y-1">
        {filteredBottom.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobile}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'text-gray-400 hover:text-gray-200 hover-surface',
              )}
            >
              <span className={cn(isActive ? 'text-blue-400' : 'text-gray-500')}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { can } = usePermission();

  const mobileNav = [...navigation, ...bottomNavigation]
    .filter((item) => mobilePrimaryRoutes.has(item.href))
    .filter((item) => can(item.permission));

  if (mobileNav.length === 0) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.18)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {mobileNav.slice(0, 5).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-12 flex-col items-center justify-center rounded-2xl px-1 text-[10px] font-medium transition',
                isActive
                  ? 'bg-blue-500/12 text-blue-400'
                  : 'text-[var(--text-muted)] active:bg-white/[0.06]',
              )}
            >
              <span className="mb-0.5 [&>svg]:h-5 [&>svg]:w-5">{item.icon}</span>
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
