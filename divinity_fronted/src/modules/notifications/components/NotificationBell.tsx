import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useOrgStore } from '@/app/store/org';
import { md3BodyMediumClass } from '@/shared/ui/material';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '../hooks/useNotifications';
import type { Notification } from '../types';

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const relativeTime = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
};

export const NotificationBell = () => {
  const navigate = useNavigate();
  const role = useOrgStore((state) => state.role);
  const [open, setOpen] = useState(false);

  const enabled = role !== 'staff';
  const { data: unreadCount = 0 } = useUnreadNotificationCount(enabled);
  const { data, isLoading } = useNotifications(enabled && open);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.results ?? [];

  if (!enabled) return null;

  const handleClick = (n: Notification) => {
    if (!n.is_read) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex-shrink-0 rounded-full p-2 text-on-surface-variant transition hover:bg-on-surface/8 hover:text-on-surface"
        aria-label="Notificaciones"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-error px-1 text-[9px] font-bold text-on-error">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-[20px] border border-outline-variant bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
              <p className="font-semibold text-on-surface">Notificaciones</p>
              {notifications.some((n) => !n.is_read) && (
                <button type="button" onClick={() => markAllRead.mutate()}
                  className="text-xs font-medium text-primary hover:underline">
                  Marcar todas leídas
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
                </div>
              ) : notifications.length === 0 ? (
                <p className={`p-6 text-center text-on-surface-variant ${md3BodyMediumClass}`}>
                  No tienes notificaciones.
                </p>
              ) : (
                <div className="divide-y divide-outline-variant/40">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleClick(n)}
                      className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left transition hover:bg-on-surface/4 ${
                        n.is_read ? '' : 'bg-primary-container/15'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {!n.is_read && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />}
                        <p className="truncate text-sm font-medium text-on-surface">{n.title}</p>
                      </div>
                      {n.body && (
                        <p className="truncate text-xs text-on-surface-variant">{n.body}</p>
                      )}
                      <p className="text-[11px] text-on-surface-variant/70">{relativeTime(n.created_at)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
