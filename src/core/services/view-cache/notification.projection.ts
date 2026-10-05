import type { NotificationModel } from '@/core/database';
import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import type { KeysetPage, PagedRows } from '@/core/types';
import { VIEW_CACHE_KEYS, VIEW_CACHE_PAGE_SIZE } from '@/shared/constants/cache.constant';
import type { ViewWrite } from './projection';

export type NotificationSource = Pick<NotificationModel, 'id' | 'type' | 'title' | 'body' | 'isRead' | 'data' | 'createdAt'>;

const toNotificationRow = (notification: NotificationSource): INotificationPreviewCacheRow => ({
  id: notification.id,
  type: notification.type,
  title: notification.title,
  body: notification.body,
  isRead: notification.isRead,
  data: notification.data,
  createdAt: notification.createdAt.getTime(),
});

export type NotificationFeedInput = {
  page: KeysetPage<NotificationSource>;
  unread: number;
};

export function projectNotificationFeed(
  { page, unread }: NotificationFeedInput,
  scope: string,
): ViewWrite[] {
  const rows = page.rows.map(toNotificationRow);
  const value: PagedRows<INotificationPreviewCacheRow> = { rows, hasMore: page.hasMore };
  return [
    { key: VIEW_CACHE_KEYS.notificationFeed, scope, value },
    { key: VIEW_CACHE_KEYS.dashboardNotifications, rows: rows.slice(0, VIEW_CACHE_PAGE_SIZE) },
    { key: VIEW_CACHE_KEYS.dashboardUnread, value: unread },
  ];
}
