import { describe, expect, test } from 'bun:test';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import type { TranslateFn } from '@/core/types';
import { createDateFormatter } from '@/shared/hooks/use-date-formatter/date';
import {
  nextEventAt,
  searchEntries,
  whenLabel,
  type SearchRows,
} from '@/features/command/model/command-entries';

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

const rows = (patch: Partial<SearchRows> = {}): SearchRows => ({
  reminders: [],
  events: [],
  tasks: [],
  projects: [],
  people: [],
  cameras: [],
  ...patch,
});

describe('command entries', () => {
  test('open reminders, open tasks, active people and every event, project and camera become entries', () => {
    const entries = searchEntries(
      rows({
        reminders: [
          { id: '1', title: 'Pagar la luz', scheduledAt: NOW + DAY, isCompleted: false },
          { id: '2', title: 'Pagado', scheduledAt: NOW, isCompleted: true },
        ],
        events: [
          { id: '3', title: 'Cena', startsAt: NOW + 2 * DAY, isAllDay: true, recurrenceRule: null },
        ],
        tasks: [
          { id: '4', projectId: '9', title: 'Comprar cajas', status: 'todo', dueAt: null },
          { id: '5', projectId: '9', title: 'Hecha', status: 'done', dueAt: null },
          { id: '6', projectId: '9', title: 'Anulada', status: 'canceled', dueAt: null },
        ],
        projects: [{ id: '9', name: 'Mudanza' }],
        people: [
          { id: '7', name: 'Luis', lastName: 'Ríos', isActive: true },
          { id: '8', name: 'Ex', lastName: '', isActive: false },
        ],
        cameras: [{ id: '10', name: 'Cámara del patio' }],
      }),
      NOW
    );
    expect(entries.map(({ kind, id, title }) => `${kind}:${id}:${title}`)).toEqual([
      'reminder:1:Pagar la luz',
      'event:3:Cena',
      'task:4:Comprar cajas',
      'project:9:Mudanza',
      'person:7:Luis Ríos',
      'camera:10:Cámara del patio',
    ]);
    expect(entries.find((item) => item.kind === 'camera')?.folded).toBe('camara del patio');
    expect(entries.find((item) => item.kind === 'task')?.parentId).toBe('9');
    expect(entries.find((item) => item.kind === 'event')?.allDay).toBe(true);
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
