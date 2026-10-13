import { describe, expect, test } from 'bun:test';
import type { CalendarEntry } from '@/core/types';
import { applyIntents, type OptimisticIntent } from '@/shared/libs/optimistic';
import {
  calendarEntryDetailRows,
  calendarEntryEditHref,
  calendarEntryRecordId,
  isOccurrence,
  type CalendarEntryDetailLabels,
} from '@/features/agenda/model/calendar-entry-actions';
import { byStart, CALENDAR_LENSES } from '@/features/agenda/model/calendar-optimistic';

const WEEK = 7 * 24 * 3_600_000;
const START = Date.UTC(2026, 9, 5, 13, 0, 0);

const series = { startsAt: START, endsAt: START + 3_600_000, rule: 'FREQ=WEEKLY' };

const occurrence = (index: number): CalendarEntry => ({
  id: `event:9@${new Date(START + index * WEEK).toISOString()}`,
  source: 'event',
  title: 'Clase de piano',
  startsAt: START + index * WEEK,
  endsAt: START + index * WEEK + 3_600_000,
  isAllDay: false,
  status: 'upcoming',
  location: 'Conservatorio',
  series,
});

const plain: CalendarEntry = {
  id: 'event:12',
  source: 'event',
  title: 'Dentista',
  startsAt: START,
  endsAt: null,
  isAllDay: false,
  status: 'upcoming',
};

const intent = (patch: Partial<OptimisticIntent>): OptimisticIntent => ({
  id: 'i1',
  table: 'calendar_event',
  kind: 'update',
  recordId: '9',
  values: {},
  confirmed: false,
  ...patch,
});

describe('an occurrence addresses its event', () => {
  test('the record id drops the source and the occurrence start', () => {
    expect(calendarEntryRecordId(occurrence(2))).toBe('9');
    expect(calendarEntryRecordId(plain)).toBe('12');
    expect(calendarEntryRecordId({ id: 'task:pending-intent-4' })).toBe('pending-intent-4');
    expect(isOccurrence(occurrence(0))).toBe(true);
    expect(isOccurrence(plain)).toBe(false);
  });

  test('editing from an occurrence opens the event on the day that was tapped', () => {
    expect(calendarEntryEditHref(occurrence(1))).toEqual({
      pathname: '/agenda',
      params: { edit: '9', at: String(START + WEEK) },
    });
  });

  test('a rename shows on every occurrence while the times stay where the series puts them', () => {
    const rows = [occurrence(0), occurrence(1), plain];
    const renamed = applyIntents(
      rows,
      [intent({ values: { title: 'Piano', startsAt: Math.round((START + 3_600_000) / 1000) } })],
      CALENDAR_LENSES,
      byStart
    );
    expect(renamed.map((entry) => [entry.title, entry.startsAt])).toEqual([
      ['Piano', START],
      ['Dentista', START],
      ['Piano', START + WEEK],
    ]);
  });

  test('deleting the event takes every occurrence with it', () => {
    const rows = [occurrence(0), occurrence(1), plain];
    const left = applyIntents(rows, [intent({ kind: 'delete' })], CALENDAR_LENSES, byStart);
    expect(left.map((entry) => entry.id)).toEqual(['event:12']);
  });

  test('the detail says how the event repeats', () => {
    const labels: CalendarEntryDetailLabels = {
      type: 'Tipo',
      status: 'Estado',
      date: 'Día',
      time: 'Hora',
      allDay: 'Todo el día',
      location: 'Lugar',
      event: 'Evento',
      task: 'Tarea',
      reminder: 'Recordatorio',
      state: {
        upcoming: 'Próximo',
        ongoing: 'En curso',
        today: 'Hoy',
        ended: 'Terminado',
        overdue: 'Vencido',
        todo: 'Por hacer',
        doing: 'En curso',
        done: 'Hecho',
      },
      repeat: { label: 'Se repite', value: 'Cada semana' },
    };
    const rows = calendarEntryDetailRows({
      entry: occurrence(1),
      state: 'upcoming',
      labels,
      formatDate: () => '12 oct',
      formatTime: () => '08:00',
    });
    expect(rows.map((row) => [row.id, row.value])).toEqual([
      ['type', 'Evento'],
      ['date', '12 oct'],
      ['time', '08:00'],
      ['status', 'Próximo'],
      ['repeat', 'Cada semana'],
      ['location', 'Conservatorio'],
    ]);
    const once = calendarEntryDetailRows({
      entry: plain,
      state: 'upcoming',
      labels: { ...labels, repeat: { label: 'Se repite', value: null } },
      formatDate: () => '5 oct',
      formatTime: () => '08:00',
    });
    expect(once.map((row) => row.id)).toEqual(['type', 'date', 'time', 'status']);
  });
});
