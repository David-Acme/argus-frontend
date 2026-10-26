import { calendarEventService } from '@/core/services/calendar-event.service';
import { projectTaskService } from '@/core/services/project-task.service';
import type { AgendaItem, TranslateFn } from '@/core/types';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import {
  calendarEntryRecordId,
  editOccurrenceBody,
  occurrenceOf,
} from '@/features/agenda/model/calendar-entry-actions';
import { eventCreate, eventUpdate, taskCreate } from '@/features/agenda/model/item-draft';
import type { EditScope, ItemDraft, Moment } from '@/features/agenda/model/item-draft';

export type CreateInput = { draft: ItemDraft; moment: Moment; t: TranslateFn };

export type SaveInput = CreateInput & { item: AgendaItem; scope: EditScope };

const nothing = () => Promise.resolve();

export function createItem({ draft, moment, t }: CreateInput) {
  if (draft.kind === 'event') {
    const body = eventCreate(draft, moment);
    return runOptimistic({
      intents: [{ table: 'calendar_event', kind: 'create', values: body }],
      call: (key) => calendarEventService.create(body, key),
      success: t('screens.agenda.sheet.saved-event'),
    });
  }
  const body = taskCreate(draft, moment);
  return runOptimistic({
    intents: [{ table: 'project_task', kind: 'create', values: body }],
    call: (key) => projectTaskService.create(body, key),
    success: t('screens.agenda.sheet.saved-task'),
  });
}

export function saveItem({ draft, moment, t, item, scope }: SaveInput) {
  if (item.origin.kind !== 'entry' || item.kind !== 'event') return nothing();
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
    success: t('screens.agenda.sheet.saved-event'),
  });
}
