import { calendarEventService } from '@/core/services/calendar-event.service';
import { projectTaskService } from '@/core/services/project-task.service';
import type { CalendarEntry, TranslateFn } from '@/core/types';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import {
  calendarEntryRecordId,
  deleteConfirmOf,
  isOccurrence,
  type DeleteConfirm,
} from '@/features/agenda/model/calendar-entry-actions';

export type EntryCommand = {
  entry: Pick<CalendarEntry, 'id' | 'source' | 'status' | 'title' | 'series'>;
  t: TranslateFn;
};

export function toggleTask({ entry, t }: EntryCommand) {
  const recordId = calendarEntryRecordId(entry);
  const status = entry.status === 'complete' ? 'todo' : 'done';
  return runOptimistic({
    intents: [{ table: 'project_task', kind: 'update', recordId, values: { status } }],
    call: () => projectTaskService.update(recordId, { status }),
    undo:
      status === 'done'
        ? { title: t('screens.agenda.state-done'), description: entry.title }
        : undefined,
  });
}

export function removeEntry({ entry, t }: EntryCommand) {
  const recordId = calendarEntryRecordId(entry);
  const isEvent = entry.source === 'event';
  const series = isOccurrence(entry);
  return runOptimistic({
    intents: [{ table: isEvent ? 'calendar_event' : 'project_task', kind: 'delete', recordId }],
    call: () =>
      isEvent ? calendarEventService.remove(recordId) : projectTaskService.remove(recordId),
    undo: {
      title: series ? t('screens.agenda.deleted-series') : t('screens.agenda.deleted'),
      description: entry.title,
    },
  });
}

export function removeConfirm({ entry, t }: EntryCommand): DeleteConfirm {
  return deleteConfirmOf(entry, {
    title: t('screens.agenda.delete-event-title', { name: entry.title }),
    body: {
      event: t('screens.agenda.delete-event-body'),
      task: t('screens.agenda.delete-task-body'),
    },
    seriesBody: t('screens.agenda.delete-series-body'),
    confirmLabel: t('screens.agenda.detail.delete'),
    seriesLabel: t('screens.agenda.delete-series'),
  });
}
