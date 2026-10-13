import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import type { NotificationRemoval } from '@/core/types';
import type { OptimisticRefusal } from '@/shared/libs/optimistic-action';
import { defineLens, type OptimisticIntentInput, type OptimisticLens } from '@/shared/libs/optimistic';
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
  return thread.entries.map((entry) => ({ table: 'notification', kind: 'delete', recordId: entry.id }));
}

export function threadIdsOf(thread: Pick<NotificationThread, 'entries'>): string[] {
  return thread.entries.map((entry) => entry.id);
}

export function removalRefusal(info: NotificationRemoval, title: string): OptimisticRefusal | null {
  return info.refused.length > 0 ? { recordIds: info.refused, title } : null;
}
