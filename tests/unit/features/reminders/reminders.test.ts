import { describe, expect, test } from 'bun:test';
import type { IReminderCacheRow, IReminderCacheSource } from '@/core/interfaces';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import { projectReminders } from '@/core/services/view-cache/reminder.projection';
import type { TranslateFn } from '@/core/types';
import { createDateFormatter } from '@/shared/hooks/use-date-formatter/date';
import { applyIntents, OptimisticRegistry, type OptimisticIntent } from '@/shared/libs/optimistic';
import {
  draftIssues,
  draftOf,
  isEmptyUpdate,
  occurrenceMoveBody,
  updateBody,
} from '@/features/reminders/model/reminder-form';
import { REMINDER_LENSES, byScheduled } from '@/features/reminders/model/reminder-optimistic';
import {
  changesOneOccurrence,
  currentOccurrence,
  isIntervalText,
  NO_REPEAT,
  repeatChoiceOf,
  repeatDraftOf,
  repeatFromChoice,
  repeatsOf,
  rolledSchedule,
  sameExceptions,
  skippedSchedule,
  withOccurrenceException,
} from '@/features/reminders/model/reminder-repeat';
import {
  isAlreadyDone,
  isSnoozable,
  snoozeBodyOf,
  snoozeIntentValues,
  snoozeOptions,
  snoozeOutcome,
  snoozeOutcomeOf,
} from '@/features/reminders/model/reminder-snooze';
import { firstOccurrenceAfter, intlZoneClock, parseRecurrenceRule } from '@/shared/libs/recurrence';
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

const intentFor = (patch: Partial<OptimisticIntent>): OptimisticIntent => ({
  id: 'i1',
  table: 'reminder',
  kind: 'update',
  recordId: '1',
  values: {},
  confirmed: false,
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
    expect(draftOf(null, NOW)).toEqual({ title: '', description: '', at: NOW, repeat: NO_REPEAT });
  });
});

describe('reminder repeat', () => {
  const weekly = row({ recurrenceRule: 'FREQ=WEEKLY' });

  test('the picker starts from the saved rule, and a rule the app cannot read starts as no repeat', () => {
    expect(repeatDraftOf('FREQ=MONTHLY;INTERVAL=2')).toEqual({ frequency: 'MONTHLY', interval: 2 });
    expect(repeatChoiceOf(repeatDraftOf('FREQ=DAILY'))).toBe('DAILY');
    expect(repeatDraftOf(null)).toEqual(NO_REPEAT);
    expect(repeatDraftOf('FREQ=WEEKLY;BYDAY=MO')).toEqual(NO_REPEAT);
    expect(repeatsOf(weekly)).toBe(true);
    expect(repeatsOf(row())).toBe(false);
  });

  test('an edit sends the rule only when the picker changed it', () => {
    const draft = draftOf(weekly, NOW);
    expect(updateBody(weekly, draft)).toEqual({});
    expect(updateBody(weekly, { ...draft, repeat: repeatFromChoice('WEEKLY', ' 2 ') })).toEqual({
      recurrenceRule: 'FREQ=WEEKLY;INTERVAL=2',
    });
    expect(updateBody(row(), { ...draftOf(row(), NOW), repeat: repeatFromChoice('DAILY', '1') })).toEqual({
      recurrenceRule: 'FREQ=DAILY',
    });
    const unknown = row({ recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO' });
    expect(updateBody(unknown, { ...draftOf(unknown, NOW), title: 'Otro' })).toEqual({ title: 'Otro' });
  });

  test('no repeat stops the series and keeps the time', () => {
    const body = updateBody(weekly, { ...draftOf(weekly, NOW), repeat: repeatFromChoice('none', '7') });
    expect(body).toEqual({ recurrenceRule: null });
    const [stopped] = applyIntents([weekly], [intentFor({ values: { ...body } })], REMINDER_LENSES);
    expect(stopped).toMatchObject({ recurrenceRule: null, scheduledAt: weekly.scheduledAt, isCompleted: false });
  });

  test('the interval is a whole number from 1 to 999, as the backend checks it', () => {
    expect(['1', ' 12 ', '999'].map(isIntervalText)).toEqual([true, true, true]);
    expect(['0', '1000', '', '2.5', '-3', 'dos'].map(isIntervalText)).toEqual([false, false, false, false, false, false]);
    expect(draftIssues({ title: 'a', description: '', at: NOW, repeat: repeatFromChoice('WEEKLY', '0') })).toEqual([
      'interval-invalid',
    ]);
    expect(draftIssues({ title: 'a', description: '', at: NOW, repeat: repeatFromChoice('none', '0') })).toEqual([]);
  });

  test('completing a recurring reminder rolls it to its next occurrence, still open', () => {
    const lima = intlZoneClock('America/Lima');
    if (!lima) throw new Error('this runtime does not know America/Lima');
    const monday = Date.UTC(2026, 9, 5, 13, 0, 0);
    const due = row({ scheduledAt: monday, recurrenceRule: 'FREQ=WEEKLY' });
    const next = rolledSchedule({ row: due, now: monday - HOUR, clock: lima });
    expect(next).toBe(Date.UTC(2026, 9, 12, 13, 0, 0));
    const missed = rolledSchedule({ row: due, now: Date.UTC(2026, 9, 20, 15, 0, 0), clock: lima });
    expect(missed).toBe(Date.UTC(2026, 9, 26, 13, 0, 0));
    expect(rolledSchedule({ row: row(), now: NOW, clock: lima })).toBeNull();
    const [rolled] = applyIntents(
      [due],
      [intentFor({ values: { scheduledAt: Math.round((next ?? 0) / 1000) } })],
      REMINDER_LENSES
    );
    expect(rolled).toMatchObject({ isCompleted: false, scheduledAt: Date.UTC(2026, 9, 12, 13, 0, 0) });
  });
});

describe('the instant roll and the audit diff that corrects it', () => {
  const lima = () => {
    const clock = intlZoneClock('America/Lima');
    if (!clock) throw new Error('this runtime does not know America/Lima');
    return clock;
  };
  const at = (year: number, month: number, day: number, hour: number): number =>
    lima().epochOf({ year, month, day, hour, minute: 0, second: 0 });

  type RollCase = { rule: string; anchor: number; scheduledAt: number; predicted: number; server: number };

  function playRoll({ rule, anchor, scheduledAt, predicted, server }: RollCase) {
    const clock = lima();
    const now = scheduledAt + HOUR;
    const shown = row({ id: '31', scheduledAt, recurrenceRule: rule });
    const parsed = parseRecurrenceRule(rule);
    if (!parsed) throw new Error(`not a rule: ${rule}`);
    expect(rolledSchedule({ row: shown, now, clock })).toBe(predicted);
    expect(firstOccurrenceAfter({ rule: parsed, anchor, moment: Math.max(scheduledAt, now), clock })).toBe(server);

    const registry = new OptimisticRegistry({ schedule: () => () => undefined, ttlMs: 60_000, graceMs: 600 });
    const begun = registry.begin({
      table: 'reminder',
      kind: 'update',
      recordId: shown.id,
      values: { scheduledAt: Math.round(predicted / 1000) },
    });
    registry.confirm(begun.id);
    expect(applyIntents([shown], registry.snapshot(), REMINDER_LENSES)[0]).toMatchObject({
      scheduledAt: predicted,
      isCompleted: false,
    });

    const synced = { ...shown, scheduledAt: server };
    registry.serverRows([{ table: 'reminder', recordId: shown.id }]);
    expect(registry.snapshot()).toEqual([]);
    expect(applyIntents([synced], registry.snapshot(), REMINDER_LENSES)[0]).toMatchObject({
      scheduledAt: server,
      isCompleted: false,
    });
  }

  test('a monthly rule on the 31st: the app predicts the 28th after February, and the audit puts back the 31st', () => {
    playRoll({
      rule: 'FREQ=MONTHLY',
      anchor: at(2026, 1, 31, 9),
      scheduledAt: at(2026, 2, 28, 9),
      predicted: at(2026, 3, 28, 9),
      server: at(2026, 3, 31, 9),
    });
  });

  test('a yearly rule on 29 February: the app predicts the 28th of the next leap year, and the audit puts back the 29th', () => {
    playRoll({
      rule: 'FREQ=YEARLY',
      anchor: at(2024, 2, 29, 10),
      scheduledAt: at(2027, 2, 28, 10),
      predicted: at(2028, 2, 28, 10),
      server: at(2028, 2, 29, 10),
    });
  });

  test('when the anchor and the time agree, the prediction is already the server day', () => {
    playRoll({
      rule: 'FREQ=MONTHLY',
      anchor: at(2026, 1, 15, 9),
      scheduledAt: at(2026, 2, 15, 9),
      predicted: at(2026, 3, 15, 9),
      server: at(2026, 3, 15, 9),
    });
  });
});

describe('reminder snooze', () => {
  const lima = () => {
    const clock = intlZoneClock('America/Lima');
    if (!clock) throw new Error('this runtime does not know America/Lima');
    return clock;
  };
  const MINUTE = 60_000;

  test('an overdue reminder offers every preset, each later than now', () => {
    const due = row({ scheduledAt: NOW - HOUR });
    const options = snoozeOptions({ row: due, now: NOW, clock: lima() });
    expect(options.map((option) => option.choice)).toEqual(['10', '30', '60', 'tomorrow']);
    expect(options.map((option) => option.at)).toEqual([NOW + 10 * MINUTE, NOW + 30 * MINUTE, NOW + HOUR, NOW + DAY]);
  });

  test('a snooze never moves a reminder earlier than its own time', () => {
    const soon = row({ scheduledAt: NOW + 20 * MINUTE });
    expect(snoozeOptions({ row: soon, now: NOW, clock: lima() }).map((option) => option.choice)).toEqual([
      '30',
      '60',
      'tomorrow',
    ]);
    const evening = row({ scheduledAt: NOW + 5 * HOUR });
    const [tomorrow] = snoozeOptions({ row: evening, now: NOW, clock: lima() });
    expect(tomorrow).toEqual({ choice: 'tomorrow', at: NOW + 5 * HOUR + DAY, folds: false });
  });

  test('tomorrow keeps the household wall clock across a change of offset', () => {
    const newYork = intlZoneClock('America/New_York');
    if (!newYork) throw new Error('this runtime does not know America/New_York');
    const saturday = Date.UTC(2026, 2, 7, 13, 0, 0);
    const [, , , tomorrow] = snoozeOptions({ row: row({ scheduledAt: saturday }), now: saturday + 1000, clock: newYork });
    expect(tomorrow).toEqual({ choice: 'tomorrow', at: Date.UTC(2026, 2, 8, 12, 0, 1), folds: false });
  });

  test('the body names minutes or tomorrow, never both', () => {
    expect(snoozeBodyOf('10')).toEqual({ minutes: 10 });
    expect(snoozeBodyOf('60')).toEqual({ minutes: 60 });
    expect(snoozeBodyOf('tomorrow')).toEqual({ tomorrow: true });
  });

  test('only an open reminder that is due today or overdue offers a snooze', () => {
    expect(isSnoozable(reminderTiming(row({ scheduledAt: NOW - HOUR }), NOW, date))).toBe(true);
    expect(isSnoozable(reminderTiming(row({ scheduledAt: NOW + HOUR }), NOW, date))).toBe(true);
    expect(isSnoozable(reminderTiming(row({ scheduledAt: NOW + 2 * DAY }), NOW, date))).toBe(false);
    expect(isSnoozable(reminderTiming(row({ scheduledAt: NOW - HOUR, isCompleted: true }), NOW, date))).toBe(false);
  });

  test('a 409 conflict is the already-done answer, and nothing else is', () => {
    expect(isAlreadyDone({ status: 409, errors: { code: 'CONFLICT', message: 'The reminder is already done' } })).toBe(true);
    expect(isAlreadyDone({ status: 409, errors: { code: 'MODULE_JOB_RUNNING', message: 'busy' } })).toBe(false);
    expect(isAlreadyDone({ status: 404, errors: { code: 'NOT_FOUND', message: 'gone' } })).toBe(false);
  });

  test('the snoozed time shows on the row at once and the reminder stays open', () => {
    const due = row({ scheduledAt: NOW - HOUR });
    const [snoozed] = applyIntents(
      [due],
      [intentFor({ values: { scheduledAt: Math.round((NOW + 30 * MINUTE) / 1000) } })],
      REMINDER_LENSES
    );
    expect(snoozed).toMatchObject({ scheduledAt: NOW + 30 * MINUTE, isCompleted: false });
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
      row({ description: 'Pedir cita', recurrenceExceptions: [] }),
      row({ id: '2', description: 'Pedir cita', isCompleted: true, completedAt: NOW, recurrenceExceptions: [] }),
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

  test('completing shows at once, deleting removes the row and a create never shows: Argus alone creates reminders', () => {
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
    expect(created.map((item) => item.id)).toEqual(['1', '2']);
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

describe('one occurrence of a recurring reminder', () => {
  const lima = () => {
    const clock = intlZoneClock('America/Lima');
    if (!clock) throw new Error('this runtime does not know America/Lima');
    return clock;
  };
  const MONDAY = Date.UTC(2026, 9, 5, 13, 0, 0);
  const NEXT_MONDAY = Date.UTC(2026, 9, 12, 13, 0, 0);
  const THIRD_MONDAY = Date.UTC(2026, 9, 19, 13, 0, 0);
  const weekly = (patch: Partial<IReminderCacheRow> = {}) =>
    row({ id: '40', scheduledAt: MONDAY, recurrenceRule: 'FREQ=WEEKLY', ...patch });

  test('only an open series offers to change one occurrence', () => {
    expect(changesOneOccurrence(weekly())).toBe(true);
    expect(changesOneOccurrence(weekly({ isCompleted: true }))).toBe(false);
    expect(changesOneOccurrence(row())).toBe(false);
  });

  test('a moved occurrence is still addressed by the start the series gave it', () => {
    const moved = weekly({
      scheduledAt: MONDAY + 2 * HOUR,
      recurrenceExceptions: [{ occurrence: MONDAY, cancelled: false, startsAt: MONDAY + 2 * HOUR }],
    });
    expect(currentOccurrence(moved)).toBe(MONDAY);
    expect(currentOccurrence(weekly())).toBe(MONDAY);
  });

  test('skipping lands on the next occurrence, past any that is skipped already', () => {
    const clock = lima();
    expect(skippedSchedule({ row: weekly(), clock })).toBe(NEXT_MONDAY);
    expect(
      skippedSchedule({
        row: weekly({ recurrenceExceptions: [{ occurrence: NEXT_MONDAY, cancelled: true }] }),
        clock,
      })
    ).toBe(THIRD_MONDAY);
    expect(
      skippedSchedule({
        row: weekly({
          recurrenceExceptions: [{ occurrence: NEXT_MONDAY, cancelled: false, startsAt: NEXT_MONDAY + HOUR }],
        }),
        clock,
      })
    ).toBe(NEXT_MONDAY + HOUR);
    expect(skippedSchedule({ row: row(), clock })).toBeNull();
  });

  test('completing a moved occurrence rolls from the series, not from the moved time', () => {
    const moved = weekly({
      scheduledAt: MONDAY + 2 * HOUR,
      recurrenceExceptions: [
        { occurrence: MONDAY, cancelled: false, startsAt: MONDAY + 2 * HOUR },
        { occurrence: NEXT_MONDAY, cancelled: true },
      ],
    });
    expect(rolledSchedule({ row: moved, now: MONDAY + 2 * HOUR, clock: lima() })).toBe(THIRD_MONDAY);
  });

  test('moving this occurrence sends its original start and the new one, and nothing when the time stays', () => {
    const moved = weekly({
      scheduledAt: MONDAY + 2 * HOUR,
      recurrenceExceptions: [{ occurrence: MONDAY, cancelled: false, startsAt: MONDAY + 2 * HOUR }],
    });
    expect(occurrenceMoveBody(moved, MONDAY + 3 * HOUR)).toEqual({
      occurrence: MONDAY / 1000,
      startsAt: (MONDAY + 3 * HOUR) / 1000,
    });
    expect(occurrenceMoveBody(moved, MONDAY + 2 * HOUR)).toBeNull();
    expect(occurrenceMoveBody(weekly(), MONDAY + HOUR)).toEqual({ occurrence: MONDAY / 1000, startsAt: (MONDAY + HOUR) / 1000 });
  });

  test('the one-occurrence actions say so in Spanish and English', () => {
    expect(es('screens.reminders.edit-occurrence')).toBe('Editar solo esta vez');
    expect(es('screens.reminders.skip-occurrence')).toBe('Cancelar solo esta vez');
    expect(es('screens.reminders.edit-series')).toBe('Editar toda la serie');
    expect(en('screens.reminders.edit-occurrence')).toBe('Edit this occurrence only');
    expect(en('screens.reminders.skip-occurrence')).toBe('Skip this occurrence');
    expect(en('screens.reminders.edit-series')).toBe('Edit the whole series');
  });
});

describe('a snooze on a recurring reminder changes only this occurrence', () => {
  const lima = () => {
    const clock = intlZoneClock('America/Lima');
    if (!clock) throw new Error('this runtime does not know America/Lima');
    return clock;
  };
  const MINUTE = 60_000;
  const EIGHT = Date.UTC(2026, 9, 6, 13, 0, 0);
  const TOMORROW_EIGHT = EIGHT + DAY;
  const daily = (patch: Partial<IReminderCacheRow> = {}) =>
    row({ id: '50', scheduledAt: EIGHT, recurrenceRule: 'FREQ=DAILY', recurrenceExceptions: [], ...patch });

  test('a snooze before the next occurrence moves this one and is still this occurrence', () => {
    const clock = lima();
    const outcome = snoozeOutcome({ row: daily(), target: EIGHT + 30 * MINUTE, clock });
    expect(outcome).toEqual({
      at: EIGHT + 30 * MINUTE,
      folds: false,
      exceptions: [{ occurrence: EIGHT, cancelled: false, startsAt: EIGHT + 30 * MINUTE }],
    });
    const snoozed = daily({ scheduledAt: outcome.at, recurrenceExceptions: outcome.exceptions ?? [] });
    expect(currentOccurrence(snoozed)).toBe(EIGHT);
    expect(skippedSchedule({ row: snoozed, clock })).toBe(TOMORROW_EIGHT);
    expect(occurrenceMoveBody(snoozed, EIGHT + HOUR)).toEqual({
      occurrence: EIGHT / 1000,
      startsAt: (EIGHT + HOUR) / 1000,
    });
    expect(rolledSchedule({ row: snoozed, now: EIGHT + 30 * MINUTE, clock })).toBe(TOMORROW_EIGHT);
  });

  test('snoozing again moves the same occurrence, never a second one', () => {
    const clock = lima();
    const once = daily({
      scheduledAt: EIGHT + 30 * MINUTE,
      recurrenceExceptions: [{ occurrence: EIGHT, cancelled: false, startsAt: EIGHT + 30 * MINUTE }],
    });
    expect(snoozeOutcome({ row: once, target: EIGHT + 2 * HOUR, clock }).exceptions).toEqual([
      { occurrence: EIGHT, cancelled: false, startsAt: EIGHT + 2 * HOUR },
    ]);
  });

  test('a snooze that reaches the next occurrence folds into it and skips this one', () => {
    const clock = lima();
    const options = snoozeOptions({ row: daily(), now: EIGHT + 5 * MINUTE, clock });
    const tomorrow = options.find((option) => option.choice === 'tomorrow');
    expect(tomorrow).toEqual({ choice: 'tomorrow', at: TOMORROW_EIGHT, folds: true });
    expect(options.filter((option) => option.choice !== 'tomorrow').every((option) => !option.folds)).toBe(true);
    const outcome = snoozeOutcomeOf({ row: daily(), now: EIGHT + 5 * MINUTE, clock, choice: 'tomorrow' });
    expect(outcome?.exceptions).toEqual([{ occurrence: EIGHT, cancelled: true }]);
    const weekly = daily({ recurrenceRule: 'FREQ=WEEKLY' });
    expect(snoozeOptions({ row: weekly, now: EIGHT + 5 * MINUTE, clock }).find((option) => option.choice === 'tomorrow'))
      .toEqual({ choice: 'tomorrow', at: TOMORROW_EIGHT + 5 * MINUTE, folds: false });
  });

  test('a one-off reminder snoozes to the time asked and keeps no exceptions', () => {
    const outcome = snoozeOutcome({ row: row({ scheduledAt: NOW - HOUR }), target: NOW + 10 * MINUTE, clock: lima() });
    expect(outcome).toEqual({ at: NOW + 10 * MINUTE, folds: false, exceptions: null });
    expect(snoozeIntentValues(outcome)).toEqual({ scheduledAt: (NOW + 10 * MINUTE) / 1000 });
  });

  test('the row shows the snoozed occurrence at once and settles when the server agrees', () => {
    const outcome = snoozeOutcome({ row: daily(), target: EIGHT + 30 * MINUTE, clock: lima() });
    const values = snoozeIntentValues(outcome);
    expect(values).toEqual({
      scheduledAt: (EIGHT + 30 * MINUTE) / 1000,
      recurrenceExceptions: [{ occurrence: EIGHT, cancelled: false, startsAt: EIGHT + 30 * MINUTE }],
    });
    const [shown] = applyIntents([daily()], [intentFor({ recordId: '50', values })], REMINDER_LENSES);
    expect(shown).toMatchObject({ scheduledAt: EIGHT + 30 * MINUTE });
    expect(shown ? currentOccurrence(shown) : null).toBe(EIGHT);

    const synced = daily({
      scheduledAt: EIGHT + 30 * MINUTE,
      recurrenceExceptions: [{ startsAt: EIGHT + 30 * MINUTE, cancelled: false, occurrence: EIGHT }],
    });
    const [kept] = applyIntents([synced], [intentFor({ recordId: '50', values })], REMINDER_LENSES);
    expect(kept?.recurrenceExceptions).toBe(synced.recurrenceExceptions);
  });

  test('an exception list is replaced by occurrence, and an unchanged occurrence restores it', () => {
    const list = withOccurrenceException([{ occurrence: TOMORROW_EIGHT, cancelled: true }], {
      occurrence: EIGHT,
      cancelled: false,
      startsAt: EIGHT + HOUR,
    });
    expect(list.map((exception) => exception.occurrence)).toEqual([EIGHT, TOMORROW_EIGHT]);
    expect(withOccurrenceException(list, { occurrence: EIGHT, cancelled: false })).toEqual([
      { occurrence: TOMORROW_EIGHT, cancelled: true },
    ]);
    expect(sameExceptions(list, [...list])).toBe(true);
    expect(sameExceptions(list, list.slice(1))).toBe(false);
    expect(sameExceptions(undefined, [])).toBe(true);
  });

  test('the folded snooze and its menu entry say so in Spanish and English', () => {
    expect(es('screens.reminders.snooze-next', { time: '08:00' })).toBe('La próxima vez, a las 08:00');
    expect(en('screens.reminders.snooze-next', { time: '08:00' })).toBe('Next time, at 08:00');
    expect(es('screens.reminders.snoozed-to-next', { when: 'mañana a las 08:00' })).toBe(
      'Esta vez se omite; te lo recordaré la próxima: mañana a las 08:00'
    );
  });
});

describe('a monthly reminder on a day of the month', () => {
  const monthly = row({ recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=31' });

  test('the picker keeps the day when only the interval changes, and drops it for another frequency', () => {
    expect(repeatDraftOf('FREQ=MONTHLY;BYMONTHDAY=31')).toEqual({ frequency: 'MONTHLY', interval: 1, monthDay: 31 });
    const draft = draftOf(monthly, NOW);
    expect(updateBody(monthly, draft)).toEqual({});
    expect(updateBody(monthly, { ...draft, repeat: repeatFromChoice('MONTHLY', '2') })).toEqual({
      recurrenceRule: 'FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=31',
    });
    expect(updateBody(monthly, { ...draft, repeat: repeatFromChoice('WEEKLY', '1') })).toEqual({
      recurrenceRule: 'FREQ=WEEKLY',
    });
    expect(changesOneOccurrence(monthly)).toBe(true);
  });
});
