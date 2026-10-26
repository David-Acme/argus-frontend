import { useRef } from 'react';
import { calendarEventService } from '@/core/services/calendar-event.service';
import { CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { feedback } from '@/shared/theme';
import type { useReminders } from '@/features/agenda/hooks/use-reminders';
import { agendaMenu, agendaRights } from '@/features/agenda/model/agenda-actions';
import type { AgendaMenuAction, AgendaRights } from '@/features/agenda/model/agenda-actions';
import type { AgendaItem } from '@/features/agenda/model/agenda-items';
import {
  calendarEntryRecordId,
  occurrenceOf,
  skipOccurrenceBody,
} from '@/features/agenda/model/calendar-entry-actions';
import { removeEntry, toggleTask } from '@/features/agenda/services/calendar-entry-commands';

export type SnoozeAction = Extract<AgendaMenuAction, 'snooze-hour' | 'snooze-tomorrow'>;

export type ItemActions = {
  rightsOf: (item: AgendaItem) => AgendaRights;
  snoozesOf: (item: AgendaItem, now: number) => SnoozeAction[];
  canSkip: (item: AgendaItem) => boolean;
  toggle: (item: AgendaItem) => void;
  snooze: (item: AgendaItem, action: SnoozeAction) => void;
  skip: (item: AgendaItem) => void;
  remove: (item: AgendaItem) => void;
};

type Reminders = ReturnType<typeof useReminders>;

const SNOOZE_CHOICE = { 'snooze-hour': '60', 'snooze-tomorrow': 'tomorrow' } as const;

const isSnooze = (action: AgendaMenuAction): action is SnoozeAction => action.startsWith('snooze');

export function useItemActions(reminders: Reminders): ItemActions {
  const { t } = useTranslation();
  const { has, can } = useCapabilities();
  const flying = useRef(new Set<string>());
  const writesReminders = has(CAPABILITY.remindersWrite);

  const rightsOf = (item: AgendaItem) => agendaRights(item, { writesReminders, can });

  const single = (item: AgendaItem, action: () => Promise<unknown>): boolean => {
    if (flying.current.has(item.id)) return false;
    flying.current.add(item.id);
    void action()
      .catch(() => undefined)
      .finally(() => flying.current.delete(item.id));
    return true;
  };

  const snoozesOf = (item: AgendaItem, now: number): SnoozeAction[] => {
    const { origin } = item;
    if (origin.kind !== 'reminder') return [];
    const snoozes = reminders.snoozeOptionsOf(origin.row, now).map((option) => option.choice);
    return agendaMenu({ item, rights: rightsOf(item), snoozes }).filter(isSnooze);
  };

  const canSkip = (item: AgendaItem): boolean => {
    const { origin } = item;
    if (!item.repeat || item.done || !rightsOf(item).edit) return false;
    return origin.kind === 'reminder' || occurrenceOf(origin.entry) !== null;
  };

  const toggle = (item: AgendaItem) => {
    const { origin } = item;
    const started = single(item, () =>
      origin.kind === 'reminder'
        ? reminders.complete(origin.row, !origin.row.isCompleted)
        : toggleTask({ entry: origin.entry, t })
    );
    if (started && !item.done) feedback('success');
  };

  const snooze = (item: AgendaItem, action: SnoozeAction) => {
    const { origin } = item;
    if (origin.kind === 'reminder')
      single(item, () => reminders.snooze(origin.row, SNOOZE_CHOICE[action]));
  };

  const skipEvent = (item: AgendaItem, occurrence: number) => {
    const recordId = calendarEntryRecordId({ id: item.id });
    const body = skipOccurrenceBody(occurrence);
    return runOptimistic({
      intents: [{ table: 'calendar_event', kind: 'update', recordId, values: body }],
      call: () => calendarEventService.changeOccurrence(recordId, body),
      undo: { title: t('screens.agenda.occurrence-skipped'), description: item.title },
      errorTitle: t('screens.agenda.occurrence-failed'),
    });
  };

  const skip = (item: AgendaItem) => {
    const { origin } = item;
    if (origin.kind === 'reminder') {
      single(item, () => reminders.skipOccurrence(origin.row));
      return;
    }
    const occurrence = occurrenceOf(origin.entry);
    if (occurrence !== null) single(item, () => skipEvent(item, occurrence));
  };

  const remove = (item: AgendaItem) => {
    const { origin } = item;
    single(item, () =>
      origin.kind === 'reminder'
        ? reminders.remove(origin.row)
        : removeEntry({ entry: origin.entry, t })
    );
  };

  return { rightsOf, snoozesOf, canSkip, toggle, snooze, skip, remove };
}
