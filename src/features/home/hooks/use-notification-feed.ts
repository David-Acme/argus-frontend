import { useMemo } from 'react';
import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import {
  NOTIFICATION_FEED_PAGE_SIZE,
  NOTIFICATION_FEED_SCOPE,
  VIEW_CACHE_KEYS,
} from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useInfiniteList, usePagedView } from '@/shared/hooks/use-infinite-list';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import { NOTIFICATION_LENSES } from '@/features/home/model/notification-optimistic';
import { notificationVisible } from '@/features/home/model/notification-modules';
import { groupNotifications } from '@/features/home/model/notification-threads';

export function useNotificationFeed() {
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

  return { synced: feed.rows, threads, paging };
}
