import { useCallback, useMemo } from 'react';
import type { IReminderCacheRow } from '@/core/interfaces';
import { reminderService } from '@/core/services/reminder.service';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { splitReminders } from '@/features/reminders/model/reminder-rows';
import { byScheduled, REMINDER_LENSES } from '@/features/reminders/model/reminder-optimistic';

export function useReminders() {
  const { t } = useTranslation();
  const cached = useViewCacheRows<IReminderCacheRow>(VIEW_CACHE_KEYS.reminderList);
  const { rows } = useOptimisticRows(cached, REMINDER_LENSES, byScheduled);
  const groups = useMemo(() => splitReminders(rows), [rows]);

  const complete = useCallback(
    (row: IReminderCacheRow, isCompleted: boolean) =>
      runOptimistic({
        intents: [{ table: 'reminder', kind: 'update', recordId: row.id, values: { isCompleted } }],
        call: () => reminderService.update(row.id, { isCompleted }),
        errorTitle: t('screens.reminders.save-failed'),
      }),
    [t]
  );

  const remove = useCallback(
    (row: IReminderCacheRow) =>
      runOptimistic({
        intents: [{ table: 'reminder', kind: 'delete', recordId: row.id }],
        call: () => reminderService.remove(row.id),
        undo: { title: t('screens.reminders.deleted'), description: row.title },
        errorTitle: t('screens.reminders.delete-failed'),
      }),
    [t]
  );

  return { rows, groups, complete, remove };
}
