import type { IReminderCacheRow } from '@/core/interfaces';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import { byScheduled, REMINDER_LENSES } from '@/features/agenda/model/reminder-optimistic';

export type Reminders = { rows: readonly IReminderCacheRow[] };

export function useReminders(): Reminders {
  const cached = useViewCacheRows<IReminderCacheRow>(VIEW_CACHE_KEYS.reminderList);
  const { rows } = useOptimisticRows(cached, REMINDER_LENSES, byScheduled);
  return { rows };
}
