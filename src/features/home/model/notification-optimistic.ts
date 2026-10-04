import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import { defineLens, type OptimisticLens } from '@/shared/libs/optimistic';

export const NOTIFICATION_LENSES: readonly OptimisticLens<INotificationPreviewCacheRow>[] = [
  defineLens<INotificationPreviewCacheRow, { isRead: boolean }>({
    table: 'notification',
    recordIdOf: (row) => row.id,
    patch: (row, values) => ({ ...row, isRead: values.isRead ?? row.isRead }),
  }),
];
