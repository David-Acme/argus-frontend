import { useMemo } from 'react';
import type { ActivityFilter, ResourceMatch } from '@/core/types';
import { useInfiniteList, useRemoteFeed } from '@/shared/hooks/use-infinite-list';
import { activityFeed } from '@/features/activity/services/activity.service';
import { ACTIVITY_PAGE_SIZE, activityScope } from '@/features/activity/model/activity-filter';

const ACTIVITY_ENTRIES: readonly ResourceMatch[] = [{ domain: 'activity', scope: 'entries' }];

export function useActivityFeed(filter: ActivityFilter, enabled: boolean) {
  const scope = useMemo(() => activityScope(filter), [filter]);
  const feed = useRemoteFeed(activityFeed, scope, enabled, ACTIVITY_ENTRIES);
  const paging = useInfiniteList({
    count: feed.rows.length,
    hasMore: feed.hasMore,
    loadMore: feed.loadMore,
    endAfter: ACTIVITY_PAGE_SIZE,
  });

  return { rows: feed.rows, status: feed.status, paging, reload: feed.reload };
}
