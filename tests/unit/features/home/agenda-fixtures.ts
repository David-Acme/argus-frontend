import { localeDictionaries } from '@/core/locales/all';
import { translate } from '@/core/i18n/translate';
import type { AgendaItem, CalendarEntry, TranslateFn } from '@/core/types';
import { createDateFormatter } from '@/shared/hooks/use-date-formatter/date';
import { agendaItems } from '@/features/agenda/model/agenda-items';
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

export const task = (
  title: string,
  startsAt: number,
  extra: Partial<CalendarEntry> = {}
): CalendarEntry => entry(`task:${title}`, startsAt, { source: 'task', title, ...extra });

export const items = (
  entries: readonly CalendarEntry[] = [],
  projects: ReadonlyMap<string, string> = new Map()
): AgendaItem[] => agendaItems({ entries, projectNames: projects });

export const prototypeDay = (): AgendaItem[] =>
  items(
    [
      task('Yoga', at(7), { status: 'complete' }),
      task('Llamar al plomero', at(11)),
      task('Pagar la luz', at(17), {
        series: { startsAt: at(17), endsAt: null, rule: 'FREQ=MONTHLY' },
      }),
      task('Sacar la basura', at(21)),
      task('Pagar el agua', at(9, 0, 1)),
      entry('event:arquitecto', at(14, 30), {
        title: 'Reunión con el arquitecto',
        endsAt: at(16),
        projectId: 'p1',
      }),
      entry('event:guitarra', at(18), { title: 'Clase de guitarra', endsAt: at(19) }),
    ],
    new Map([['p1', 'Mudanza']])
  );
