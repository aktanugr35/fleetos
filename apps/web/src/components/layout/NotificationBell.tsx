'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import { usePermission } from '@/hooks/usePermission';

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

function dotClass(type: string): string {
  if (type === 'COMPLIANCE_EXPIRED') return 'bg-red-500';
  if (type === 'COMPLIANCE_WARNING') return 'bg-yellow-500';
  if (type === 'SETTLEMENT_READY') return 'bg-emerald-500';
  return 'bg-blue-500';
}

export function NotificationBell() {
  const router = useRouter();
  const { can } = usePermission();
  const staff = can('compliance:view');

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!staff) return;
    try {
      setLoading(true);
      const res = await api.get('/notifications?limit=25');
      const data = res.data.data as { notifications: NotificationRow[]; unreadCount: number };
      setItems(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [staff]);

  useEffect(() => {
    if (staff) void load();
  }, [staff, load]);

  useEffect(() => {
    if (open && staff) void load();
  }, [open, staff, load]);

  if (!staff) return null;

  const handleOpen = async (n: NotificationRow) => {
    if (!n.isRead) {
      try {
        await api.patch(`/notifications/${n.id}/read`);
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover-surface transition"
        aria-label="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-12 w-80 card p-0 animate-fade-in shadow-xl z-50 border border-[var(--border-color)]">
              <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between gap-2">
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">Notifications</h3>
              {unreadCount > 0 ? (
                <button type="button" onClick={() => void markAllRead()} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  Mark all read
                </button>
              ) : null}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {loading && items.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] py-8 text-center">Loading…</p>
              ) : items.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] py-8 text-center px-4">
                  No notifications yet. Open Compliance to sync alerts.
                </p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => void handleOpen(n)}
                    className={`w-full text-left px-4 py-3 hover-surface transition border-b border-[var(--border-color)] last:border-0 ${
                      !n.isRead ? 'bg-blue-500/[0.06]' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotClass(n.type)}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${n.isRead ? 'font-medium text-[var(--text-secondary)]' : 'font-semibold text-[var(--text-primary)]'}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1">{formatRelativeTime(n.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="p-3 border-t border-[var(--border-color)]">
              <Link
                href="/dashboard/compliance"
                onClick={() => setOpen(false)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline w-full text-center block"
              >
                View compliance
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}