import { useCallback, useMemo } from 'react';
import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import { notificationService } from '@/core/services/notification.service';
import {
  NOTIFICATION_FEED_PAGE_SIZE,
  NOTIFICATION_FEED_SCOPE,
  VIEW_CACHE_KEYS,
} from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useInfiniteList, usePagedView } from '@/shared/hooks/use-infinite-list';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import {
  NOTIFICATION_LENSES,
  removalRefusal,
  threadDeleteIntents,
  threadIdsOf,
} from '@/features/home/model/notification-optimistic';
import { notificationVisible } from '@/features/home/model/notification-modules';
import { groupNotifications, type NotificationThread } from '@/features/home/model/notification-threads';

export function useNotificationFeed() {
  const { t } = useTranslation();
  const feed = usePagedView<INotificationPreviewCacheRow>(
    VIEW_CACHE_KEYS.notificationFeed,
    NOTIFICATION_FEED_SCOPE
  );
  const { moduleActive } = useCapabilities();
  const { rows } = useOptimisticRows(feed.rows, NOTIFICATION_LENSES);
  const threads = useMemo(
    () => groupNotifications(rows.filter((row) => notificationVisible(row, moduleActive))),
    [moduleActive, rows]
  );
  const paging = useInfiniteList({
    count: feed.rows.length,
    hasMore: feed.hasMore,
    loadMore: feed.loadMore,
    endAfter: NOTIFICATION_FEED_PAGE_SIZE,
  });

  const remove = useCallback(
    (thread: NotificationThread) =>
      void runOptimistic({
        intents: threadDeleteIntents(thread),
        call: () => notificationService.remove(threadIdsOf(thread)),
        undo: { title: t('screens.home.notification-deleted'), description: thread.latest.title },
        errorTitle: t('screens.home.notification-delete-failed'),
        refusals: (info) => removalRefusal(info, t('screens.home.notification-delete-partial')),
      }),
    [t]
  );

  return { synced: feed.rows, threads, paging, remove };
}
