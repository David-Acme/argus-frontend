import { describe, expect, test } from 'bun:test';
import type { IReminderCacheRow, IReminderCacheSource } from '@/core/interfaces';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import { projectReminders } from '@/core/services/view-cache/reminder.projection';
import type { TranslateFn } from '@/core/types';
import { createDateFormatter } from '@/shared/hooks/use-date-formatter/date';
import { applyIntents, type OptimisticIntent } from '@/shared/libs/optimistic';
import {
  createBody,
  draftIssues,
  draftOf,
  isEmptyUpdate,
  updateBody,
} from '@/features/reminders/model/reminder-form';
import { REMINDER_LENSES, byScheduled } from '@/features/reminders/model/reminder-optimistic';
import { matchesReminder, reminderTiming, reminderWhen, splitReminders } from '@/features/reminders/model/reminder-rows';
import { searchKinds, searchPlaceholder } from '@/features/home/model/home-search';

const es = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.es, key as never, params as never)) as TranslateFn;
const en = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.en, key as never, params as never)) as TranslateFn;

const date = createDateFormatter('es', {
  languageTag: 'es-PE',
  regionCode: 'PE',
  hourCycle: 'h23',
  firstWeekday: 1,
  timeZone: 'UTC',
} as never);

const NOW = Date.UTC(2026, 9, 6, 15, 0, 0);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const row = (patch: Partial<IReminderCacheRow> = {}): IReminderCacheRow => ({
  id: '1',
  title: 'Llamar al médico',
  description: '',
  scheduledAt: NOW + HOUR,
  isCompleted: false,
  completedAt: null,
  recurrenceRule: null,
  ...patch,
});

describe('reminder rows', () => {
  test('pending ones come first by time and the done ones are the latest few', () => {
    const rows = [
      row({ id: 'late', scheduledAt: NOW + DAY }),
      row({ id: 'soon', scheduledAt: NOW + HOUR }),
      row({ id: 'old', isCompleted: true, completedAt: NOW - 3 * DAY, scheduledAt: NOW - 4 * DAY }),
      row({ id: 'new', isCompleted: true, completedAt: NOW - HOUR, scheduledAt: NOW - 2 * HOUR }),
    ];
    const { pending, done } = splitReminders(rows, 1);
    expect(pending.map((item) => item.id)).toEqual(['soon', 'late']);
    expect(done.map((item) => item.id)).toEqual(['new']);
  });

  test('a reminder is overdue only when its time passed and it is not done', () => {
    expect(reminderTiming(row({ scheduledAt: NOW - HOUR }), NOW, date)).toBe('overdue');
    expect(reminderTiming(row({ scheduledAt: NOW + HOUR }), NOW, date)).toBe('today');
    expect(reminderTiming(row({ scheduledAt: NOW + 2 * DAY }), NOW, date)).toBe('later');
    expect(reminderTiming(row({ scheduledAt: NOW - 2 * DAY }), NOW, date)).toBe('overdue');
    expect(reminderTiming(row({ scheduledAt: NOW - 2 * DAY, isCompleted: true }), NOW, date)).toBe('done');
  });

  test('says today, tomorrow or the day, in the language of the app', () => {
    expect(reminderWhen(row({ scheduledAt: NOW + HOUR }), NOW, date, es)).toMatch(/^Hoy · /);
    expect(reminderWhen(row({ scheduledAt: NOW + DAY }), NOW, date, es)).toMatch(/^Mañana · /);
    expect(reminderWhen(row({ scheduledAt: NOW + 3 * DAY }), NOW, date, en)).toMatch(/ · /);
    expect(reminderWhen(row({ scheduledAt: NOW + DAY }), NOW, date, en)).toMatch(/^Tomorrow · /);
  });

  test('the search looks in the title and in the notes', () => {
    expect(matchesReminder(row({ description: 'Pedir cita con Ana' }), 'cita')).toBe(true);
    expect(matchesReminder(row(), 'MÉDICO')).toBe(true);
    expect(matchesReminder(row(), 'dentista')).toBe(false);
    expect(matchesReminder(row(), '  ')).toBe(true);
  });
});

describe('reminder form', () => {
  test('a draft needs a title of at most 200 characters, notes of at most 2000 and a time', () => {
    expect(draftIssues({ title: ' ', description: '', at: NOW })).toEqual(['title-required']);
    expect(draftIssues({ title: 'x'.repeat(201), description: '', at: NOW })).toEqual(['title-long']);
    expect(draftIssues({ title: 'a', description: 'x'.repeat(2001), at: NOW })).toEqual(['description-long']);
    expect(draftIssues({ title: 'a', description: '', at: Number.NaN })).toEqual(['time-invalid']);
    expect(draftIssues({ title: 'a', description: '', at: NOW })).toEqual([]);
  });

  test('a new reminder is sent in seconds, trimmed and without empty notes', () => {
    expect(createBody({ title: '  Pagar luz ', description: ' ', at: NOW + 400 })).toEqual({
      title: 'Pagar luz',
      scheduledAt: Math.round((NOW + 400) / 1000),
    });
    expect(createBody({ title: 'Pagar luz', description: 'Recibo azul', at: NOW }).description).toBe('Recibo azul');
  });

  test('an edit sends only what changed and nothing when nothing did', () => {
    const saved = row({ description: 'Pedir cita' });
    expect(updateBody(saved, draftOf(saved, NOW))).toEqual({});
    expect(isEmptyUpdate(updateBody(saved, draftOf(saved, NOW)))).toBe(true);
    expect(updateBody(saved, { ...draftOf(saved, NOW), title: 'Llamar al dentista' })).toEqual({
      title: 'Llamar al dentista',
    });
    expect(updateBody(saved, { ...draftOf(saved, NOW), description: '' })).toEqual({ description: '' });
    expect(updateBody(saved, { ...draftOf(saved, NOW), at: saved.scheduledAt + 60_000 })).toEqual({
      scheduledAt: Math.round((saved.scheduledAt + 60_000) / 1000),
    });
  });

  test('a new draft starts at the time the screen offers', () => {
    expect(draftOf(null, NOW)).toEqual({ title: '', description: '', at: NOW });
  });
});

describe('reminder projection and optimistic rows', () => {
  const source = (patch: Partial<IReminderCacheSource> = {}): IReminderCacheSource => ({
    id: '1',
    title: 'Llamar al médico',
    description: 'Pedir cita',
    scheduledAt: new Date(NOW + HOUR),
    isCompleted: false,
    completedAt: null,
    recurrenceRule: null,
    ...patch,
  });

  test('writes one flat list in milliseconds with the notes and the completion time', () => {
    const [write] = projectReminders({
      reminders: [source(), source({ id: '2', isCompleted: true, completedAt: new Date(NOW) })],
    });
    expect(write && 'rows' in write ? write.rows : null).toEqual([
      row({ description: 'Pedir cita' }),
      row({ id: '2', description: 'Pedir cita', isCompleted: true, completedAt: NOW }),
    ]);
  });

  const intent = (patch: Partial<OptimisticIntent>): OptimisticIntent => ({
    id: 'i1',
    table: 'reminder',
    kind: 'update',
    recordId: '1',
    values: {},
    confirmed: false,
    ...patch,
  });

  test('completing shows at once, deleting removes the row and a create appears in time order', () => {
    const rows = [row(), row({ id: '2', scheduledAt: NOW + 2 * HOUR })];
    const done = applyIntents(rows, [intent({ values: { isCompleted: true } })], REMINDER_LENSES, byScheduled);
    expect(done[0]?.isCompleted).toBe(true);
    expect(done[0]?.completedAt).not.toBeNull();
    const gone = applyIntents(rows, [intent({ kind: 'delete' })], REMINDER_LENSES, byScheduled);
    expect(gone.map((item) => item.id)).toEqual(['2']);
    const created = applyIntents(
      rows,
      [intent({ kind: 'create', recordId: 'pending-9', values: { title: 'Nuevo', scheduledAt: Math.round((NOW + 90 * 60_000) / 1000) } })],
      REMINDER_LENSES,
      byScheduled
    );
    expect(created.map((item) => item.id)).toEqual(['1', 'pending-9', '2']);
  });

  test('an edit changes the title and the time on the row while the server answers', () => {
    const edited = applyIntents(
      [row()],
      [intent({ values: { title: 'Nuevo título', scheduledAt: Math.round((NOW + 5 * HOUR) / 1000), description: null } })],
      REMINDER_LENSES
    );
    expect(edited[0]).toMatchObject({ title: 'Nuevo título', scheduledAt: NOW + 5 * HOUR, description: '' });
  });
});

describe('home search copy', () => {
  test('names only what can be searched', () => {
    expect(searchKinds({ reminders: true, events: false, projects: false })).toEqual(['reminder']);
    expect(searchKinds({ reminders: true, events: true, projects: true })).toEqual(['reminder', 'event', 'project', 'task']);
    expect(searchKinds({ reminders: false, events: false, projects: false })).toEqual([]);
  });

  test('joins the names in the app language', () => {
    expect(searchPlaceholder({ reminders: true, events: false, projects: false }, es)).toBe('Buscar recordatorio…');
    expect(searchPlaceholder({ reminders: true, events: true, projects: false }, es)).toBe('Buscar recordatorio o evento…');
    expect(searchPlaceholder({ reminders: true, events: true, projects: true }, es)).toBe(
      'Buscar recordatorio, evento, proyecto o tarea…'
    );
    expect(searchPlaceholder({ reminders: true, events: true, projects: true }, en)).toBe(
      'Search reminder, event, project or task…'
    );
    expect(searchPlaceholder({ reminders: false, events: false, projects: false }, es)).toBe('Buscar…');
  });
});
