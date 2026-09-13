export type NotificationType = 'new_member' | 'payment_received' | 'subscription_expiring' | 'subscription_expired';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  count: number;
  page: number;
  results: Notification[];
}
