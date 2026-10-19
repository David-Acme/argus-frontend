import { describe, expect, test } from 'bun:test';
import { localeDictionaries } from '@/core/i18n/locales';
import type { CalendarEntry } from '@/core/types';
import { applyIntents, settledIntents, type OptimisticIntent } from '@/shared/libs/optimistic';
import {
  availableCalendarEntryActions,
  calendarEntryDetailRows,
  calendarEntryEditHref,
  calendarEntryRecordId,
  editOccurrenceBody,
  isOccurrence,
  occurrenceOf,
  seriesDeleteConfirm,
  skipOccurrenceBody,
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

  test('deleting a series asks first and says it applies to the whole series; a single event goes straight to undo', () => {
    const labels = { title: 'Delete Piano?', description: 'Applies to the whole series', confirmLabel: 'Delete every occurrence' };
    expect(seriesDeleteConfirm(occurrence(1), labels)).toEqual({ ...labels, intent: 'danger' });
    expect(seriesDeleteConfirm(plain, labels)).toBeUndefined();
  });

  test('the series actions read "se aplica a toda la serie" in Spanish and say the same in English', () => {
    const { es, en } = localeDictionaries;
    expect(es.screens.agenda['applies-to-series']).toBe('Se aplica a toda la serie');
    expect(es.screens.agenda['series-hint']).toContain('se aplica a toda la serie');
    expect(es.screens.agenda['delete-series-body']).toStartWith('Se aplica a toda la serie');
    expect(en.screens.agenda['applies-to-series']).toBe('Applies to the whole series');
    expect(en.screens.agenda['series-hint']).toContain('applies to the whole series');
    expect(en.screens.agenda['delete-series-body']).toStartWith('Applies to the whole series');
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

describe('one occurrence of a series', () => {
  test('an occurrence knows the start it was given by the series, a single event has none', () => {
    expect(occurrenceOf(occurrence(2))).toBe(START + 2 * WEEK);
    const moved: CalendarEntry = { ...occurrence(2), startsAt: START + 2 * WEEK + 3_600_000 };
    expect(occurrenceOf(moved)).toBe(START + 2 * WEEK);
    expect(occurrenceOf(plain)).toBeNull();
  });

  test('an editor of a series may change or skip one occurrence; a single event offers neither', () => {
    const permissions = { canEdit: true, canDelete: true };
    expect(availableCalendarEntryActions(occurrence(1), permissions)).toEqual([
      'edit-occurrence',
      'edit',
      'skip-occurrence',
      'delete',
    ]);
    expect(availableCalendarEntryActions(occurrence(1), { canEdit: false, canDelete: false })).toEqual([]);
    expect(availableCalendarEntryActions(plain, permissions)).toEqual(['edit', 'delete']);
  });

  test('the bodies name the occurrence by its original start, in seconds', () => {
    const at = START + WEEK;
    expect(skipOccurrenceBody(at)).toEqual({ occurrence: at / 1000, cancelled: true });
    expect(
      editOccurrenceBody({ occurrence: at, title: 'Piano', location: '', startsAt: at + 3_600_000, endsAt: null })
    ).toEqual({ occurrence: at / 1000, title: 'Piano', location: '', startsAt: at / 1000 + 3600 });
    expect(
      editOccurrenceBody({ occurrence: at, title: 'Piano', location: 'Sala', startsAt: at, endsAt: at + 7_200_000 })
    ).toEqual({ occurrence: at / 1000, title: 'Piano', location: 'Sala', startsAt: at / 1000, endsAt: at / 1000 + 7200 });
  });

  test('skipping hides only that occurrence until the series row says so', () => {
    const rows = [occurrence(0), occurrence(1), occurrence(2), plain];
    const skip = intent({ values: { ...skipOccurrenceBody(START + WEEK) }, confirmed: true });
    const shown = applyIntents(rows, [skip], CALENDAR_LENSES, byStart);
    expect(shown.map((entry) => entry.id)).toEqual([
      occurrence(0).id,
      'event:12',
      occurrence(2).id,
    ]);
    expect(settledIntents(rows, [skip], CALENDAR_LENSES)).toEqual([]);
    const synced = [occurrence(0), occurrence(2), plain];
    expect(settledIntents(synced, [skip], CALENDAR_LENSES)).toEqual(['i1']);
  });

  test('moving one occurrence moves and renames it alone, keeping its length', () => {
    const rows = [occurrence(0), occurrence(1), occurrence(2)];
    const body = editOccurrenceBody({
      occurrence: START + WEEK,
      title: 'Piano tarde',
      location: 'Casa',
      startsAt: START + WEEK + 7_200_000,
      endsAt: null,
    });
    const moved = applyIntents(rows, [intent({ values: { ...body }, confirmed: true })], CALENDAR_LENSES, byStart);
    expect(moved.map((entry) => [entry.title, entry.startsAt, entry.endsAt, entry.location])).toEqual([
      ['Clase de piano', START, START + 3_600_000, 'Conservatorio'],
      ['Piano tarde', START + WEEK + 7_200_000, START + WEEK + 10_800_000, 'Casa'],
      ['Clase de piano', START + 2 * WEEK, START + 2 * WEEK + 3_600_000, 'Conservatorio'],
    ]);
    expect(settledIntents(rows, [intent({ values: { ...body }, confirmed: true })], CALENDAR_LENSES)).toEqual([]);
    expect(settledIntents(moved, [intent({ values: { ...body }, confirmed: true })], CALENDAR_LENSES)).toEqual(['i1']);
  });

  test('the one-occurrence actions say so in Spanish and English', () => {
    const { es, en } = localeDictionaries;
    expect(es.screens.agenda['edit-occurrence']).toBe('Editar solo esta vez');
    expect(es.screens.agenda['edit-series']).toBe('Editar toda la serie');
    expect(es.screens.agenda['skip-occurrence']).toBe('Cancelar solo esta vez');
    expect(en.screens.agenda['edit-occurrence']).toBe('Edit this occurrence only');
    expect(en.screens.agenda['edit-series']).toBe('Edit the whole series');
    expect(en.screens.agenda['skip-occurrence']).toBe('Skip this occurrence');
  });
});
