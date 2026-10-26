import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import { notificationService } from '@/core/services/notification.service';
import { notificationThreadKey } from '@/core/services/notification';
import { CAPABILITY, NOTIFICATION_FEED_SCOPE, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { usePagedView } from '@/shared/hooks/use-infinite-list';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import {
  NOTIFICATION_LENSES,
  notificationReadIntents,
} from '@/features/home/model/notification-optimistic';
import { notificationVisible } from '@/features/home/model/notification-modules';
import {
  groupNotifications,
  type NotificationThread,
} from '@/features/home/model/notification-threads';

export function readThread(thread: Pick<NotificationThread, 'latest' | 'unreadIds'>): void {
  if (thread.unreadIds.length === 0) return;
  void runOptimistic({
    intents: notificationReadIntents(thread.unreadIds),
    call: () =>
      notificationService.markRead({
        threadKey: notificationThreadKey(thread.latest.data),
        ids: thread.unreadIds,
      }),
  });
}

export function useNews() {
  const { has, moduleActive } = useCapabilities();
  const readable = has(CAPABILITY.notificationsRead);
  const feed = usePagedView<INotificationPreviewCacheRow>(
    VIEW_CACHE_KEYS.notificationFeed,
    NOTIFICATION_FEED_SCOPE,
    readable
  );
  const { rows } = useOptimisticRows(feed.rows, NOTIFICATION_LENSES);
  const threads = groupNotifications(rows.filter((row) => notificationVisible(row, moduleActive)));
  return { readable, feed, threads, read: readThread };
}
