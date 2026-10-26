import { calendarEventService } from '@/core/services/calendar-event.service';
import { projectTaskService } from '@/core/services/project-task.service';
import { reminderService } from '@/core/services/reminder.service';
import type { TranslateFn } from '@/core/types';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import type { AgendaItem } from '@/features/agenda/model/agenda-items';
import {
  calendarEntryRecordId,
  editOccurrenceBody,
  occurrenceOf,
} from '@/features/agenda/model/calendar-entry-actions';
import {
  eventCreate,
  eventUpdate,
  reminderCreate,
  taskCreate,
} from '@/features/agenda/model/item-draft';
import type { EditScope, ItemDraft, Moment } from '@/features/agenda/model/item-draft';
import {
  isEmptyUpdate,
  occurrenceMoveBody,
  updateBody,
} from '@/features/agenda/model/reminder-form';
import {
  repeatChoiceOf,
  repeatDraftOf,
  repeatFromChoice,
} from '@/features/agenda/model/reminder-repeat';

export type CreateInput = { draft: ItemDraft; moment: Moment; t: TranslateFn };

export type SaveInput = CreateInput & { item: AgendaItem; scope: EditScope };

const SAVED = {
  reminder: 'screens.agenda.sheet.saved-reminder',
  event: 'screens.agenda.sheet.saved-event',
  task: 'screens.agenda.sheet.saved-task',
} as const;

const nothing = () => Promise.resolve();

export function createItem({ draft, moment, t }: CreateInput) {
  const success = t(SAVED[draft.kind]);
  if (draft.kind === 'reminder') {
    const body = reminderCreate(draft, moment);
    return runOptimistic({
      intents: [{ table: 'reminder', kind: 'create', values: body }],
      call: (key) => reminderService.create(body, key),
      success,
    });
  }
  if (draft.kind === 'event') {
    const body = eventCreate(draft, moment);
    return runOptimistic({
      intents: [{ table: 'calendar_event', kind: 'create', values: body }],
      call: (key) => calendarEventService.create(body, key),
      success,
    });
  }
  const body = taskCreate(draft, moment);
  return runOptimistic({
    intents: [{ table: 'project_task', kind: 'create', values: body }],
    call: (key) => projectTaskService.create(body, key),
    success,
  });
}

function saveReminder({ draft, moment, t, item, scope }: SaveInput) {
  if (item.origin.kind !== 'reminder') return nothing();
  const { row } = item.origin;
  if (scope === 'one') {
    const move = occurrenceMoveBody(row, moment.start);
    if (move === null) return nothing();
    return runOptimistic({
      intents: [
        {
          table: 'reminder',
          kind: 'update',
          recordId: row.id,
          values: { scheduledAt: move.startsAt },
        },
      ],
      call: () => reminderService.changeOccurrence(row.id, move),
      success: t('screens.agenda.occurrence-saved'),
    });
  }
  const saved = repeatChoiceOf(repeatDraftOf(row.recurrenceRule));
  const body = updateBody(row, {
    title: draft.title,
    description: draft.notes,
    at: moment.start,
    repeat: draft.repeat === saved ? undefined : repeatFromChoice(draft.repeat, '1'),
  });
  if (isEmptyUpdate(body)) return nothing();
  return runOptimistic({
    intents: [{ table: 'reminder', kind: 'update', recordId: row.id, values: body }],
    call: () => reminderService.update(row.id, body),
    success: t(SAVED.reminder),
  });
}

function saveEvent({ draft, moment, t, item, scope }: SaveInput) {
  if (item.origin.kind !== 'entry') return nothing();
  const recordId = calendarEntryRecordId(item.origin.entry);
  const occurrence = occurrenceOf(item.origin.entry);
  if (scope === 'one' && occurrence !== null) {
    const body = editOccurrenceBody({
      occurrence,
      title: draft.title.trim(),
      location: draft.place.trim(),
      startsAt: moment.start,
      endsAt: moment.end,
    });
    return runOptimistic({
      intents: [{ table: 'calendar_event', kind: 'update', recordId, values: body }],
      call: () => calendarEventService.changeOccurrence(recordId, body),
      success: t('screens.agenda.occurrence-saved'),
    });
  }
  const body = eventUpdate(draft, moment, item);
  return runOptimistic({
    intents: [{ table: 'calendar_event', kind: 'update', recordId, values: body }],
    call: () => calendarEventService.update(recordId, body),
    success: t(SAVED.event),
  });
}

export const saveItem = (input: SaveInput) =>
  input.item.kind === 'reminder' ? saveReminder(input) : saveEvent(input);
