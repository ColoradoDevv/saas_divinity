import { api } from '@/shared/api/api';
import type { NotificationListResponse } from '../types';

export const notificationService = {
  async list(): Promise<NotificationListResponse> {
    const res = await api.get('/notifications/');
    return res.data;
  },

  async unreadCount(): Promise<number> {
    const res = await api.get('/notifications/unread-count/');
    return res.data.count;
  },

  async markRead(id: number): Promise<void> {
    await api.post(`/notifications/${id}/read/`);
  },

  async markAllRead(): Promise<void> {
    await api.post('/notifications/read-all/');
  },
};
