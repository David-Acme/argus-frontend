import type { IReminderCacheRow } from '@/core/interfaces';
import { CAPABILITY, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useNow } from '@/shared/hooks/use-now';
import { weekOf, weekStats } from '@/features/profile/model/week-stats';
import type { WeekRange, WeekStats } from '@/features/profile/model/week-stats';

export type Week = { range: WeekRange; stats: WeekStats | null };

const HOUR_MS = 3_600_000;

export function useWeek(): Week {
  const { has } = useCapabilities();
  const now = useNow(HOUR_MS);
  const reminders = useViewCacheRows<IReminderCacheRow>(VIEW_CACHE_KEYS.reminderList);
  const range = weekOf(new Date(now));
  return { range, stats: has(CAPABILITY.remindersRead) ? weekStats(reminders, range) : null };
}
