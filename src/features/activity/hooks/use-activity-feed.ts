import { useMemo } from 'react';
import type { ActivityFilter, ResourceMatch } from '@/core/types';
import { useFeedList } from '@/shared/hooks/use-infinite-list';
import { activityFeed } from '@/features/activity/services/activity.service';
import { ACTIVITY_PAGE_SIZE, activityScope } from '@/features/activity/model/activity-filter';

const ACTIVITY_ENTRIES: readonly ResourceMatch[] = [{ domain: 'activity', scope: 'entries' }];

export function useActivityFeed(filter: ActivityFilter, enabled: boolean) {
  const scope = useMemo(() => activityScope(filter), [filter]);
  const feed = useFeedList(activityFeed, scope, {
    enabled,
    resources: ACTIVITY_ENTRIES,
    endAfter: ACTIVITY_PAGE_SIZE,
  });
  return { rows: feed.rows, status: feed.status, paging: feed.paging, reload: feed.reload };
}
