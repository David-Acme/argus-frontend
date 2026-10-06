import { readActivityPage } from '@/core/contracts/activity.contract';
import type { IServiceResponse } from '@/core/interfaces';
import { httpService } from '@/core/services/http';
import { errorResponse } from '@/core/services/http/http-envelope';
import { RemoteFeed } from '@/core/services/paging';
import type { ActivityItem, RemotePage } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { activityFilterOf, activityQuery, activityScope, EMPTY_ACTIVITY_FILTER } from '@/features/activity/model/activity-filter';

const ACTIVITY_PATH = '/sync/activity';

class ActivityService {
  async page(scope: string, cursor: string | null): Promise<IServiceResponse<RemotePage<ActivityItem, string>>> {
    const query = activityQuery(activityFilterOf(scope), cursor, Date.now());
    const response = await httpService.get<unknown>(`${ACTIVITY_PATH}?${query}`);
    if (!response.ok) return { ...response, info: null };
    const page = readActivityPage(response.info);
    return page
      ? { ...response, info: page }
      : errorResponse(response.status, 'INVALID_RESPONSE', 'The activity answer is not in the expected shape');
  }
}

export const activityService = new ActivityService();

export const activityFeed = new RemoteFeed<ActivityItem, string>({
  key: VIEW_CACHE_KEYS.activityFeed,
  keyOf: (item) => String(item.id),
  compare: (left, right) => right.createdAt - left.createdAt || right.id - left.id,
  fetch: (scope, cursor) => activityService.page(scope, cursor),
  pinned: [activityScope(EMPTY_ACTIVITY_FILTER)],
});
