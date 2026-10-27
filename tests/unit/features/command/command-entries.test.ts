import { describe, expect, test } from 'bun:test';
import { localeDictionaries } from '@/core/i18n/locales';
import type { ISearchHitCacheRow } from '@/core/interfaces';
import { translate } from '@/core/i18n/translate';
import type { TranslateFn } from '@/core/types';
import { createDateFormatter } from '@/shared/hooks/use-date-formatter/date';
import { nextEventAt, searchEntries, whenLabel } from '@/features/command/model/command-entries';

const es = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.es, key as never, params as never)) as TranslateFn;

const NOW = new Date(2026, 9, 26, 12, 0).getTime();
const DAY = 86_400_000;

const date = createDateFormatter('es', {
  languageTag: 'es-PE',
  regionCode: 'PE',
  uses24hourClock: true,
  firstWeekday: 2,
  timeZone: null,
});

const hit = (
  fields: Pick<ISearchHitCacheRow, 'kind' | 'id' | 'title' | 'at'> & Partial<ISearchHitCacheRow>
): ISearchHitCacheRow => ({
  allDay: false,
  parentId: null,
  recurrenceRule: null,
  ...fields,
});

describe('command entries', () => {
  test('database hits become entries, a task keeps its project and an all-day event says so', () => {
    const entries = searchEntries(
      [
        hit({ kind: 'event', id: '3', title: 'Cena', at: NOW + 2 * DAY, allDay: true }),
        hit({ kind: 'task', id: '4', title: 'Comprar cajas', at: null, parentId: '9' }),
        hit({ kind: 'project', id: '9', title: 'Mudanza', at: null }),
        hit({ kind: 'person', id: '7', title: 'Luis Ríos', at: null }),
        hit({ kind: 'camera', id: '10', title: 'Cámara del patio', at: null }),
      ],
      NOW
    );
    expect(entries.map(({ kind, id, title }) => `${kind}:${id}:${title}`)).toEqual([
      'event:3:Cena',
      'task:4:Comprar cajas',
      'project:9:Mudanza',
      'person:7:Luis Ríos',
      'camera:10:Cámara del patio',
    ]);
    expect(entries.find((item) => item.kind === 'task')?.parentId).toBe('9');
    expect(entries.find((item) => item.kind === 'event')?.allDay).toBe(true);
    expect(entries.find((item) => item.kind === 'project')?.parentId).toBeUndefined();
  });

  test('a recurring event hit is shown at its next occurrence', () => {
    const anchor = NOW - 10 * DAY;
    const [weekly] = searchEntries(
      [
        hit({
          kind: 'event',
          id: 'w',
          title: 'Guitarra',
          at: anchor,
          recurrenceRule: 'FREQ=WEEKLY',
        }),
      ],
      NOW
    );
    expect((weekly?.at ?? 0) - anchor).toBe(14 * DAY);
  });

  test('a past recurring event is found at its next occurrence, a single one at its start', () => {
    const anchor = NOW - 10 * DAY;
    const weekly = {
      id: 'w',
      title: 'Guitarra',
      startsAt: anchor,
      isAllDay: false,
      recurrenceRule: 'FREQ=WEEKLY',
    };
    const next = nextEventAt(weekly, NOW);
    expect(next).toBeGreaterThanOrEqual(NOW);
    expect(next - anchor).toBe(14 * DAY);
    expect(nextEventAt({ ...weekly, recurrenceRule: null }, NOW)).toBe(anchor);
  });

  test('the time reads today, tomorrow or the day, with the hour unless all day', () => {
    const at = (days: number, hours: number) => new Date(2026, 9, 26 + days, hours, 0).getTime();
    expect(whenLabel({ at: at(0, 17), now: NOW, date, t: es })).toBe('hoy 17:00');
    expect(whenLabel({ at: at(1, 9), allDay: true, now: NOW, date, t: es })).toBe('mañana');
    expect(whenLabel({ at: at(3, 9), allDay: true, now: NOW, date, t: es })).toBe(
      date.formatDayMonth(new Date(at(3, 9)))
    );
  });
});
