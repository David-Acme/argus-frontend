import type { NotificationModel } from '@/core/database';
import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import { VIEW_CACHE_KEYS } from '@/shared/constants/cache.constant';
import type { ViewWrite } from './projection';

export type NotificationSource = Pick<NotificationModel, 'id' | 'type' | 'title' | 'body' | 'isRead' | 'data'>;

export type NotificationProjectionInput = {
  notifications: readonly NotificationSource[];
  unread: number;
};

export function projectNotifications({ notifications, unread }: NotificationProjectionInput): ViewWrite[] {
  const rows: INotificationPreviewCacheRow[] = notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    isRead: notification.isRead,
    data: notification.data,
  }));
  return [
    { key: VIEW_CACHE_KEYS.dashboardNotifications, rows },
    { key: VIEW_CACHE_KEYS.dashboardUnread, value: unread },
  ];
}
