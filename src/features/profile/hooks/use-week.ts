import type { IProjectTaskCacheRow } from '@/core/interfaces';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useNow } from '@/shared/hooks/use-now';
import { weekOf, weekStats } from '@/features/profile/model/week-stats';
import type { WeekRange, WeekStats } from '@/features/profile/model/week-stats';

export type Week = { range: WeekRange; stats: WeekStats | null };

const HOUR_MS = 3_600_000;

export function useWeek(): Week {
  const { can } = useCapabilities();
  const now = useNow(HOUR_MS);
  const tasks = useViewCacheRows<IProjectTaskCacheRow>(VIEW_CACHE_KEYS.taskList);
  const range = weekOf(new Date(now));
  return { range, stats: can('project_task', 'read') ? weekStats(tasks, range) : null };
}
