import type { IReminderCacheRow, IReminderUpdate } from '@/core/interfaces';
import { defineLens, type OptimisticLens } from '@/shared/libs/optimistic';

const reminderLens = defineLens<IReminderCacheRow, IReminderUpdate>({
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
  }),
  create: () => null,
});

export const REMINDER_LENSES: readonly OptimisticLens<IReminderCacheRow>[] = [reminderLens];

export const byScheduled = (left: IReminderCacheRow, right: IReminderCacheRow): number =>
  left.scheduledAt - right.scheduledAt;
