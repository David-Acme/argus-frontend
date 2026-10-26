import type { IReminderCacheRow } from '@/core/interfaces';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import type { CalendarEntry, TranslateFn } from '@/core/types';
import { createDateFormatter } from '@/shared/hooks/use-date-formatter/date';
import { agendaItems, type AgendaItem } from '@/features/home/model/agenda-items';
import type { WordingContext } from '@/features/home/model/agenda-wording';

export const date = createDateFormatter('es', {
  languageTag: 'es-PE',
  regionCode: 'PE',
  uses24hourClock: true,
  firstWeekday: 1,
  timeZone: 'America/Lima',
});

export const t: TranslateFn = (key, ...rest) => translate(localeDictionaries.es, key, ...rest);

export const at = (hour: number, minute = 0, dayOffset = 0): number =>
  new Date(2026, 9, 21 + dayOffset, hour, minute).getTime();

export const NOW = at(15, 42);

export const TODAY = { from: at(0), to: at(23, 59) + 59_999 };

export const TOMORROW = { from: at(0, 0, 1), to: at(23, 59, 1) + 59_999 };

export const wording: WordingContext = { now: NOW, date, t };

export function reminder(
  id: string,
  scheduledAt: number,
  extra: Partial<IReminderCacheRow> = {}
): IReminderCacheRow {
  return {
    id,
    title: id,
    description: '',
    scheduledAt,
    isCompleted: false,
    completedAt: null,
    recurrenceRule: null,
    ...extra,
  };
}

export function entry(
  id: string,
  startsAt: number,
  extra: Partial<CalendarEntry> = {}
): CalendarEntry {
  return {
    id,
    source: 'event',
    title: id,
    startsAt,
    endsAt: null,
    isAllDay: false,
    status: 'upcoming',
    ...extra,
  };
}

export const items = (
  reminders: readonly IReminderCacheRow[],
  entries: readonly CalendarEntry[] = [],
  projects: ReadonlyMap<string, string> = new Map()
): AgendaItem[] => agendaItems({ reminders, entries, projectNames: projects });

export const prototypeDay = (): AgendaItem[] =>
  items(
    [
      reminder('Yoga', at(7), { isCompleted: true, completedAt: at(8) }),
      reminder('Llamar al plomero', at(11)),
      reminder('Pagar la luz', at(17), { recurrenceRule: 'FREQ=MONTHLY' }),
      reminder('Sacar la basura', at(21)),
      reminder('Pagar el agua', at(9, 0, 1)),
    ],
    [
      entry('event:arquitecto', at(14, 30), {
        title: 'Reunión con el arquitecto',
        endsAt: at(16),
        projectId: 'p1',
      }),
      entry('event:guitarra', at(18), { title: 'Clase de guitarra', endsAt: at(19) }),
    ],
    new Map([['p1', 'Mudanza']])
  );
