import { useCallback, useMemo } from 'react';
import type { IReminderCacheRow, IReminderUpdate } from '@/core/interfaces';
import { reminderService } from '@/core/services/reminder.service';
import type { AppAccess } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows, useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { zoneClock } from '@/shared/libs/recurrence';
import { reminderWhen, splitReminders } from '@/features/reminders/model/reminder-rows';
import { byScheduled, REMINDER_LENSES } from '@/features/reminders/model/reminder-optimistic';
import { currentOccurrence, rolledSchedule, skippedSchedule } from '@/features/reminders/model/reminder-repeat';
import {
  isAlreadyDone,
  snoozeBodyOf,
  snoozeIntentValues,
  snoozeOptions,
  snoozeOutcomeOf,
  type SnoozeChoice,
  type SnoozeOption,
} from '@/features/reminders/model/reminder-snooze';

export function useReminders() {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const householdZone = useViewCacheValue<AppAccess>(VIEW_CACHE_KEYS.appContext)?.timeZone ?? null;
  const clock = useMemo(() => zoneClock(householdZone), [householdZone]);
  const cached = useViewCacheRows<IReminderCacheRow>(VIEW_CACHE_KEYS.reminderList);
  const { rows } = useOptimisticRows(cached, REMINDER_LENSES, byScheduled);
  const groups = useMemo(() => splitReminders(rows), [rows]);

  const complete = useCallback(
    (row: IReminderCacheRow, isCompleted: boolean) => {
      const now = Date.now();
      const next = isCompleted ? rolledSchedule({ row, now, clock }) : null;
      const shown: IReminderUpdate = next === null ? { isCompleted } : { scheduledAt: Math.round(next / 1000) };
      return runOptimistic({
        intents: [{ table: 'reminder', kind: 'update', recordId: row.id, values: shown }],
        call: () => reminderService.update(row.id, { isCompleted }),
        success:
          next === null
            ? undefined
            : t('screens.reminders.rolled', { when: reminderWhen({ ...row, scheduledAt: next }, now, date, t) }),
        errorTitle: t('screens.reminders.save-failed'),
      });
    },
    [clock, date, t]
  );

  const snoozeOptionsOf = useCallback(
    (row: IReminderCacheRow, now: number): SnoozeOption[] => snoozeOptions({ row, now, clock }),
    [clock]
  );

  const snooze = useCallback(
    (row: IReminderCacheRow, choice: SnoozeChoice) => {
      const now = Date.now();
      const outcome = snoozeOutcomeOf({ row, now, clock, choice });
      const when = outcome === null ? null : reminderWhen({ ...row, scheduledAt: outcome.at }, now, date, t);
      return runOptimistic({
        intents:
          outcome === null
            ? []
            : [{ table: 'reminder', kind: 'update', recordId: row.id, values: snoozeIntentValues(outcome) }],
        call: () => reminderService.snooze(row.id, snoozeBodyOf(choice)),
        success:
          when === null
            ? t('screens.reminders.snoozed-plain')
            : outcome?.folds
              ? t('screens.reminders.snoozed-to-next', { when })
              : t('screens.reminders.snoozed', { when }),
        refusalNotice: (result) =>
          isAlreadyDone(result)
            ? { title: t('screens.reminders.already-done-title'), description: t('screens.reminders.already-done') }
            : null,
        errorTitle: t('screens.reminders.snooze-failed'),
      });
    },
    [clock, date, t]
  );

  const skipOccurrence = useCallback(
    (row: IReminderCacheRow) => {
      const now = Date.now();
      const next = skippedSchedule({ row, clock });
      return runOptimistic({
        intents:
          next === null
            ? []
            : [{ table: 'reminder', kind: 'update', recordId: row.id, values: { scheduledAt: Math.round(next / 1000) } }],
        call: () =>
          reminderService.changeOccurrence(row.id, {
            occurrence: Math.round(currentOccurrence(row) / 1000),
            cancelled: true,
          }),
        success:
          next === null
            ? t('screens.reminders.occurrence-skipped-plain')
            : t('screens.reminders.occurrence-skipped', {
                when: reminderWhen({ ...row, scheduledAt: next }, now, date, t),
              }),
        errorTitle: t('screens.reminders.occurrence-failed'),
      });
    },
    [clock, date, t]
  );

  const stopRepeating = useCallback(
    (row: IReminderCacheRow) =>
      runOptimistic({
        intents: [{ table: 'reminder', kind: 'update', recordId: row.id, values: { recurrenceRule: null } }],
        call: () => reminderService.update(row.id, { recurrenceRule: null }),
        success: t('screens.reminders.stopped-repeating'),
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

  return { rows, groups, complete, snooze, snoozeOptionsOf, skipOccurrence, stopRepeating, remove };
}
