import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import { notificationThreadKey } from '@/core/services/notification';
import type { NotificationThreadTarget } from '@/core/types';
import {
  defineLens,
  type OptimisticIntentInput,
  type OptimisticLens,
} from '@/shared/libs/optimistic';
import type { NotificationThread } from '@/features/home/model/notification-threads';

export const NOTIFICATION_LENSES: readonly OptimisticLens<INotificationPreviewCacheRow>[] = [
  defineLens<INotificationPreviewCacheRow, { isRead: boolean }>({
    table: 'notification',
    recordIdOf: (row) => row.id,
    patch: (row, values) => ({ ...row, isRead: values.isRead ?? row.isRead }),
  }),
];

export function threadDeleteIntents(
  thread: Pick<NotificationThread, 'entries'>
): OptimisticIntentInput[] {
  return thread.entries.map((entry) => ({
    table: 'notification',
    kind: 'delete',
    recordId: entry.id,
  }));
}

export function notificationReadIntents(ids: readonly string[]): OptimisticIntentInput[] {
  return ids.map((recordId) => ({
    table: 'notification',
    kind: 'update',
    recordId,
    values: { isRead: true },
  }));
}

export const threadTargetOf = (
  thread: Pick<NotificationThread, 'latest' | 'entries'>,
  userId: string
): NotificationThreadTarget => ({
  userId,
  threadKey: notificationThreadKey(thread.latest.data),
  ids: thread.entries.map((entry) => entry.id),
});
