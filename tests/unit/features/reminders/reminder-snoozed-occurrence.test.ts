import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  isSnoozedNow,
  isSnoozedOccurrenceRefusal,
  snoozedAtOf,
  withSnooze,
} from '@/features/reminders/model/reminder-snooze';

const read = (path: string) => readFileSync(join(import.meta.dir, '../../../../src', path), 'utf8');

const row = (id: string, scheduledAt: number, isCompleted = false) => ({ id, scheduledAt, isCompleted });

describe('a reminder this device snoozed', () => {
  test('is snoozed while its time is the one the snooze set', () => {
    const memory = { '4': 5_000 };
    expect(isSnoozedNow(memory, row('4', 5_000))).toBe(true);
    expect(isSnoozedNow(memory, row('4', 9_000))).toBe(false);
    expect(isSnoozedNow(memory, row('4', 5_000, true))).toBe(false);
    expect(isSnoozedNow(memory, row('7', 5_000))).toBe(false);
  });

  test('recording a snooze keeps only the entries still in force', () => {
    const memory = { '1': 1_000, '2': 2_000, '3': 3_000 };
    const rows = [row('1', 1_000), row('2', 8_000), row('5', 5_000)];
    expect(withSnooze({ memory, id: '5', at: 6_000, rows })).toEqual({ '1': 1_000, '5': 6_000 });
    expect(withSnooze({ memory: { '1': 1_000 }, id: '1', at: 4_000, rows })).toEqual({ '1': 4_000 });
  });

  test('the snoozed time is the server answer, in milliseconds', () => {
    expect(snoozedAtOf({ id: 4, scheduledAt: 1_700_000_600 })).toBe(1_700_000_600_000);
    expect(snoozedAtOf({ id: 4 })).toBeNull();
    expect(snoozedAtOf(null)).toBeNull();
  });
});

describe('the refusal for a snoozed occurrence', () => {
  test('is the 422 the series answers when the time is not one of its occurrences', () => {
    const message = 'occurrence is not an occurrence of this series';
    expect(isSnoozedOccurrenceRefusal({ status: 422, errors: { code: 'VALIDATION_ERROR', message } })).toBe(true);
    expect(
      isSnoozedOccurrenceRefusal({
        status: 422,
        errors: { code: 'VALIDATION_ERROR', message: 'x', list: [{ code: 'VALIDATION_ERROR', message }] },
      })
    ).toBe(true);
  });

  test('other refusals stay errors', () => {
    expect(
      isSnoozedOccurrenceRefusal({
        status: 422,
        errors: { code: 'VALIDATION_ERROR', message: 'That occurrence has already been delivered' },
      })
    ).toBe(false);
    expect(
      isSnoozedOccurrenceRefusal({
        status: 409,
        errors: { code: 'CONFLICT', message: 'occurrence is not an occurrence of this series' },
      })
    ).toBe(false);
    expect(isSnoozedOccurrenceRefusal({ status: 422, errors: null })).toBe(false);
  });
});

describe('the reminder list', () => {
  const ROW = read('features/reminders/components/reminder-row.tsx');
  const SECTION = read('features/reminders/components/reminders-section.tsx');
  const HOOK = read('features/reminders/hooks/use-reminders.ts');
  const DIALOG = read('features/reminders/components/reminder-dialog.tsx');

  test('a snoozed reminder keeps "only this time" visible but disabled, with the reason', () => {
    expect(ROW).toContain("? { disabled: true, description: t('screens.reminders.snoozed-occurrence-hint') }");
    expect(ROW.match(/\.\.\.onlyThisTime,/g)).toHaveLength(2);
    expect(SECTION).toContain('snoozed={isSnoozed(reminder)}');
  });

  test('a snooze the device made is remembered from the server answer', () => {
    expect(HOOK).toContain('const at = result?.ok ? (snoozedAtOf(result.info) ?? target) : null;');
    expect(HOOK).toContain('if (at !== null) record(row.id, at);');
  });

  test('a snooze made elsewhere answers with an explanation, not an error', () => {
    expect(HOOK).toContain('refusalNotice: snoozedNotice,');
    expect(DIALOG).toContain('refusalNotice: occurrenceRefusal,');
    expect(SECTION).toContain('occurrenceRefusal={snoozedNotice}');
  });
});
