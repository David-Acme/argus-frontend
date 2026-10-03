import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import { defineLens, type OptimisticLens } from '@/shared/libs/optimistic';

export const NOTIFICATION_LENSES: readonly OptimisticLens<INotificationPreviewCacheRow>[] = [
  defineLens<INotificationPreviewCacheRow, { isRead: boolean }>({
    table: 'notification',
    recordIdOf: (row) => row.id,
    patch: (row, values) => ({ ...row, isRead: values.isRead ?? row.isRead }),
  }),
];

export function unreadAfterReads(
  unread: number,
  synced: readonly Pick<INotificationPreviewCacheRow, 'isRead'>[],
  shown: readonly Pick<INotificationPreviewCacheRow, 'isRead'>[]
): number {
  const count = (rows: readonly Pick<INotificationPreviewCacheRow, 'isRead'>[]) =>
    rows.reduce((total, row) => total + (row.isRead ? 0 : 1), 0);
  return Math.max(0, unread - (count(synced) - count(shown)));
}
