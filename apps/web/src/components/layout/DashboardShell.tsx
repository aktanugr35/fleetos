'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { MobileBottomNav, Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

interface SidebarContextValue {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  closeMobile: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error('useSidebar must be used within DashboardShell');
  }
  return ctx;
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <SidebarContext.Provider value={{ mobileOpen, setMobileOpen, closeMobile }}>
      <div className="flex min-h-dvh overflow-x-hidden">
        {mobileOpen ? (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={closeMobile}
          />
        ) : null}
        <Sidebar />
        <div className="flex-1 ml-0 lg:ml-64 min-w-0 flex flex-col">
          <Header />
          <main className="flex-1 px-3 pb-24 pt-4 sm:p-6 animate-fade-in">{children}</main>
          <MobileBottomNav />
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
