import type { IReminderCacheRow, IReminderCacheSource } from '@/core/interfaces';
import { VIEW_CACHE_KEYS, VIEW_CACHE_LIST_LIMIT } from '@/shared/constants/cache.constant';
import type { ViewWrite } from './projection';

export type ReminderProjectionInput = {
  reminders: readonly IReminderCacheSource[];
};

const toRow = (reminder: IReminderCacheSource): IReminderCacheRow => ({
  id: reminder.id,
  title: reminder.title,
  description: reminder.description,
  scheduledAt: reminder.scheduledAt.getTime(),
  isCompleted: reminder.isCompleted,
  completedAt: reminder.completedAt?.getTime() ?? null,
  recurrenceRule: reminder.recurrenceRule,
});

export function projectReminders({ reminders }: ReminderProjectionInput): ViewWrite[] {
  return [{ key: VIEW_CACHE_KEYS.reminderList, rows: reminders.map(toRow), limit: VIEW_CACHE_LIST_LIMIT }];
}
