import { useCallback } from 'react';
import { notificationService } from '@/core/services/notification.service';
import { useAuthStore } from '@/core/stores';
import { NOTIFICATION_FEED_PAGE_SIZE } from '@/shared/constants';
import { useInfiniteList } from '@/shared/hooks/use-infinite-list';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { threadDeleteIntents, threadTargetOf } from '@/features/home/model/notification-optimistic';
import type { NotificationThread } from '@/features/home/model/notification-threads';
import { useNews } from '@/features/home/hooks/use-news';

export function useNotificationFeed() {
  const { t } = useTranslation();
  const userId = String(useAuthStore((state) => state.user?.id ?? ''));
  const { feed, threads } = useNews();
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
        call: () => notificationService.removeThread(threadTargetOf(thread, userId)),
        undo: { title: t('screens.home.notification-deleted'), description: thread.latest.title },
        errorTitle: t('screens.home.notification-delete-failed'),
      }),
    [t, userId]
  );

  return { synced: feed.rows, threads, paging, remove };
}
