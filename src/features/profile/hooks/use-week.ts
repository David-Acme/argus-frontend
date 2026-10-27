import type { IWeekTaskCounts } from '@/core/interfaces';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useNow } from '@/shared/hooks/use-now';
import { weekOf, type WeekRange } from '@/shared/libs/week-range';

export type Week = { range: WeekRange; stats: IWeekTaskCounts | null };

const HOUR_MS = 3_600_000;

const NO_TASKS: IWeekTaskCounts = { done: 0, pending: 0 };

export function useWeek(): Week {
  const { can } = useCapabilities();
  const now = useNow(HOUR_MS);
  const counts = useViewCacheValue<IWeekTaskCounts>(VIEW_CACHE_KEYS.weekTasks);
  return {
    range: weekOf(new Date(now)),
    stats: can('project_task', 'read') ? (counts ?? NO_TASKS) : null,
  };
}
