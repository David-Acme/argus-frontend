import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { synchronizeService } from '@/core/services/sync';
import { MODULE_IDS, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useOfflineNotice } from '@/shared/components/layout/use-offline-notice';
import { useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useNow } from '@/shared/hooks/use-now';
import { notificationHrefOf } from '@/features/notification';
import { useNews } from '@/features/home/hooks/use-news';
import { useNewsRemove } from '@/features/home/hooks/use-news-remove';
import { NEWS_ROUTE } from '@/features/home/model/news';
import { filterNews, newsFilters, newsLinkOf } from '@/features/home/model/news-filter';
import type { NewsFilter } from '@/features/home/model/news-filter';

const MINUTE_MS = 60_000;

const HOME_HREF = '/';

function useLink(threads: ReturnType<typeof useNews>['threads']) {
  const router = useRouter();
  const { notificationId } = useLocalSearchParams<{ notificationId?: string }>();
  const synced = useViewCacheValue<boolean>(VIEW_CACHE_KEYS.syncReady) === true;
  const link = newsLinkOf(threads, notificationId, synced);
  const href = link.kind === 'open' ? notificationHrefOf(link.row.data) : null;
  useEffect(() => {
    if (href === null) return;
    if (href === HOME_HREF) router.setParams({ notificationId: undefined });
    else router.replace(href);
  }, [href, router]);
  return { gone: link.kind === 'gone', forget: () => router.replace(NEWS_ROUTE) };
}

export function useNewsScreen() {
  const router = useRouter();
  const now = useNow(MINUTE_MS);
  const { moduleActive } = useCapabilities();
  const news = useNews();
  const remove = useNewsRemove();
  const link = useLink(news.threads);
  const offline = useOfflineNotice();
  const [filter, setFilter] = useState<NewsFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const filters = newsFilters(moduleActive(MODULE_IDS.surveillance));
  const shown: NewsFilter = filters.includes(filter) ? filter : 'all';
  const refresh = async () => {
    setRefreshing(true);
    await synchronizeService.syncOnce();
    setRefreshing(false);
  };
  return {
    now,
    news,
    remove,
    link,
    filter: shown,
    filters,
    threads: filterNews(news.threads, shown),
    pick: setFilter,
    offline,
    syncedAt: offline ? synchronizeService.lastSyncAtValue : null,
    moreFailed: news.feed.paging.footer === 'error',
    loadMore: news.feed.paging.onEndReached,
    retryMore: news.feed.paging.retry,
    refresh: { refreshing, onRefresh: () => void refresh() },
    back: () => (router.canGoBack() ? router.back() : router.replace(HOME_HREF)),
  };
}

export type NewsScreenState = ReturnType<typeof useNewsScreen>;
