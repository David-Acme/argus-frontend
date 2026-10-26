import type { IReminderCacheRow, IReminderUpdate } from '@/core/interfaces';
import type { RecurrenceException } from '@/core/types';
import { defineLens } from '@/shared/libs/optimistic';
import type { OptimisticLens } from '@/shared/libs/optimistic';
import { sameExceptions } from '@/features/agenda/model/reminder-repeat';

type ReminderOptimisticValues = IReminderUpdate & {
  recurrenceExceptions?: readonly RecurrenceException[];
};

const exceptionsOf = (
  row: IReminderCacheRow,
  values: Partial<ReminderOptimisticValues>
): IReminderCacheRow['recurrenceExceptions'] =>
  values.recurrenceExceptions === undefined ||
  sameExceptions(values.recurrenceExceptions, row.recurrenceExceptions)
    ? row.recurrenceExceptions
    : values.recurrenceExceptions;

const reminderLens = defineLens<IReminderCacheRow, ReminderOptimisticValues>({
  table: 'reminder',
  recordIdOf: (row) => row.id,
  patch: (row, values) => ({
    ...row,
    title: values.title ?? row.title,
    description: values.description === undefined ? row.description : (values.description ?? ''),
    scheduledAt: values.scheduledAt === undefined ? row.scheduledAt : values.scheduledAt * 1000,
    isCompleted: values.isCompleted ?? row.isCompleted,
    completedAt:
      values.isCompleted === undefined ? row.completedAt : values.isCompleted ? Date.now() : null,
    recurrenceRule:
      values.recurrenceRule === undefined ? row.recurrenceRule : values.recurrenceRule || null,
    recurrenceExceptions: exceptionsOf(row, values),
  }),
  create: (recordId, values) =>
    values.scheduledAt === undefined
      ? null
      : {
          id: recordId,
          title: values.title ?? '',
          description: values.description ?? '',
          scheduledAt: values.scheduledAt * 1000,
          isCompleted: false,
          completedAt: null,
          recurrenceRule: values.recurrenceRule || null,
        },
});

export const REMINDER_LENSES: readonly OptimisticLens<IReminderCacheRow>[] = [reminderLens];

export const byScheduled = (left: IReminderCacheRow, right: IReminderCacheRow): number =>
  left.scheduledAt - right.scheduledAt;
