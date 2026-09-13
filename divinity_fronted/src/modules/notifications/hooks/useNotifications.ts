import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notificationService } from '../services/notificationService';

export const useNotifications = (enabled: boolean) =>
  useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => notificationService.list(),
    enabled,
    refetchInterval: 60_000,
  });

export const useUnreadNotificationCount = (enabled: boolean) =>
  useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationService.unreadCount(),
    enabled,
    refetchInterval: 60_000,
  });

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
