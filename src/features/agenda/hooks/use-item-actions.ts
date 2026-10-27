import { useRef } from 'react';
import { calendarEventService } from '@/core/services/calendar-event.service';
import type { AgendaItem, AgendaRights } from '@/core/types';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { feedback } from '@/shared/theme';
import { agendaRights } from '@/features/agenda/model/agenda-actions';
import {
  calendarEntryRecordId,
  occurrenceOf,
  skipOccurrenceBody,
} from '@/features/agenda/model/calendar-entry-actions';
import { removeEntry, toggleTask } from '@/features/agenda/services/calendar-entry-commands';

export type ItemActions = {
  rightsOf: (item: AgendaItem) => AgendaRights;
  canSkip: (item: AgendaItem) => boolean;
  toggle: (item: AgendaItem) => void;
  skip: (item: AgendaItem) => void;
  remove: (item: AgendaItem) => void;
};

export function useItemActions(): ItemActions {
  const { t } = useTranslation();
  const { can } = useCapabilities();
  const flying = useRef(new Set<string>());

  const rightsOf = (item: AgendaItem) => agendaRights(item, can);

  const single = (item: AgendaItem, action: () => Promise<unknown>): boolean => {
    if (flying.current.has(item.id)) return false;
    flying.current.add(item.id);
    void action()
      .catch(() => undefined)
      .finally(() => flying.current.delete(item.id));
    return true;
  };

  const canSkip = (item: AgendaItem): boolean => {
    if (!item.repeat || item.done || !rightsOf(item).edit) return false;
    return occurrenceOf(item.entry) !== null;
  };

  const toggle = (item: AgendaItem) => {
    if (!rightsOf(item).toggle) return;
    const started = single(item, () => toggleTask({ entry: item.entry, t }));
    if (started && !item.done) feedback('success');
  };

  const skip = (item: AgendaItem) => {
    const occurrence = occurrenceOf(item.entry);
    if (occurrence === null) return;
    const recordId = calendarEntryRecordId(item.entry);
    const body = skipOccurrenceBody(occurrence);
    single(item, () =>
      runOptimistic({
        intents: [{ table: 'calendar_event', kind: 'update', recordId, values: body }],
        call: () => calendarEventService.changeOccurrence(recordId, body),
        undo: { title: t('screens.agenda.occurrence-skipped'), description: item.title },
        errorTitle: t('screens.agenda.occurrence-failed'),
      })
    );
  };

  const remove = (item: AgendaItem) => {
    single(item, () => removeEntry({ entry: item.entry, t }));
  };

  return { rightsOf, canSkip, toggle, skip, remove };
}
