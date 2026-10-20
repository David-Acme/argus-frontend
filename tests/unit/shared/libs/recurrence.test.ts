import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { backendPath } from '@tests/support/backend-dir';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import type { TranslateFn, WallTime, ZoneClock } from '@/core/types';
import { zoneWallReader } from '@/shared/hooks/use-date-formatter/date';
import {
  firstOccurrenceAfter,
  formatRecurrenceRule,
  intlZoneClock,
  isRecurrenceInterval,
  occurrenceAt,
  occurrencesBetween,
  parseRecurrenceRule,
  recurrenceLabel,
  sameTimeTomorrow,
  zoneClock,
} from '@/shared/libs/recurrence';

type SeriesCase = {
  name: string;
  zone: string;
  rule: string;
  anchor: string;
  count?: number;
  expect?: string[];
  displayZone?: string;
  expectDisplay?: string[];
  after?: string;
  expectFirst?: string;
};

type Fixture = { cases: SeriesCase[]; invalid: string[] };

const FIXTURE_PATH =
  process.env.ARGUS_RECURRENCE_FIXTURE ?? backendPath('scripts/fixtures/recurrence/cases.json');

function readFixture(): Fixture | string {
  if (!existsSync(FIXTURE_PATH)) {
    return `the shared recurrence fixture is missing at ${FIXTURE_PATH}: set ARGUS_RECURRENCE_FIXTURE to the backend's scripts/fixtures/recurrence/cases.json`;
  }
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as Fixture;
}

const fixture = readFixture();
const cases = typeof fixture === 'string' ? [] : fixture.cases;
const invalid = typeof fixture === 'string' ? [] : fixture.invalid;

const WALL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;

function wallFrom(text: string): WallTime {
  const match = WALL_RE.exec(text);
  if (!match) throw new Error(`not a wall time: ${text}`);
  const [year = 0, month = 0, day = 0, hour = 0, minute = 0, second = 0] = match.slice(1).map(Number);
  return { year, month, day, hour, minute, second };
}

const pad = (value: number, width = 2): string => String(value).padStart(width, '0');

const wallText = (wall: WallTime): string =>
  `${pad(wall.year, 4)}-${pad(wall.month)}-${pad(wall.day)}T${pad(wall.hour)}:${pad(wall.minute)}:${pad(wall.second)}`;

function clockIn(zone: string): ZoneClock {
  const clock = intlZoneClock(zone);
  if (!clock) throw new Error(`this runtime does not know the zone ${zone}`);
  return clock;
}

const CLOCKS = {
  'through Intl': clockIn,
  'through the app clock': zoneClock,
} as const;

const es = ((key: string, params?: Record<string, string | number>) =>
  translate(localeDictionaries.es, key as never, params as never)) as TranslateFn;

describe('recurrence matches the backend fixture', () => {
  test('the shared fixture is readable', () => {
    if (typeof fixture === 'string') throw new Error(fixture);
    expect(cases.length).toBeGreaterThan(0);
  });

  for (const item of cases) {
    for (const [how, clockOf] of Object.entries(CLOCKS)) {
      test(`${item.name} (${how})`, () => {
        const clock = clockOf(item.zone);
        const rule = parseRecurrenceRule(item.rule);
        expect(rule).not.toBeNull();
        if (!rule) return;
        const anchor = clock.epochOf(wallFrom(item.anchor));
        if (item.count !== undefined && item.expect) {
          const instants = Array.from({ length: item.count }, (_, index) =>
            occurrenceAt({ rule, anchor, index, clock })
          );
          expect(instants.map((instant) => wallText(clock.wallOf(instant)))).toEqual(item.expect);
          if (item.displayZone && item.expectDisplay) {
            const display = clockIn(item.displayZone);
            expect(instants.map((instant) => wallText(display.wallOf(instant)))).toEqual(item.expectDisplay);
          }
        }
        if (item.after && item.expectFirst) {
          const moment = clock.epochOf(wallFrom(item.after));
          const first = firstOccurrenceAfter({ rule, anchor, moment, clock });
          expect(first === null ? null : wallText(clock.wallOf(first))).toBe(item.expectFirst);
        }
      });
    }
  }

  test('every rule the backend refuses is refused here too', () => {
    expect(invalid.length).toBeGreaterThan(0);
    for (const rule of invalid) expect(parseRecurrenceRule(rule)).toBeNull();
  });
});

describe('recurrence rules', () => {
  test('reads the frequency and the interval, one of each', () => {
    expect(parseRecurrenceRule('FREQ=WEEKLY')).toEqual({ frequency: 'WEEKLY', interval: 1 });
    expect(parseRecurrenceRule('INTERVAL=3;FREQ=DAILY')).toEqual({ frequency: 'DAILY', interval: 3 });
    expect(parseRecurrenceRule('FREQ=MONTHLY;INTERVAL=999')).toEqual({ frequency: 'MONTHLY', interval: 999 });
    expect(parseRecurrenceRule(null)).toBeNull();
    expect(parseRecurrenceRule('FREQ=DAILY;INTERVAL=-2')).toBeNull();
    expect(parseRecurrenceRule('FREQ=DAILY;INTERVAL= 2')).toBeNull();
  });

  test('writes the rule the way the backend reads it back', () => {
    expect(formatRecurrenceRule({ frequency: 'YEARLY', interval: 1 })).toBe('FREQ=YEARLY');
    expect(formatRecurrenceRule({ frequency: 'WEEKLY', interval: 2 })).toBe('FREQ=WEEKLY;INTERVAL=2');
    expect(parseRecurrenceRule(formatRecurrenceRule({ frequency: 'DAILY', interval: 45 }))).toEqual({
      frequency: 'DAILY',
      interval: 45,
    });
    expect([0, 1, 999, 1000, 2.5].map(isRecurrenceInterval)).toEqual([false, true, true, false, false]);
  });

  test('names the rule in the user language', () => {
    expect(recurrenceLabel(null, es)).toBeNull();
    expect(recurrenceLabel('FREQ=WEEKLY', es)).toBe('Cada semana');
    expect(recurrenceLabel('FREQ=MONTHLY;INTERVAL=3', es)).toBe('Cada 3 meses');
    expect(recurrenceLabel('FREQ=DAILY;BYHOUR=8', es)).toBe('Se repite');
  });
});

describe('occurrences in a window', () => {
  const clock = clockIn('America/Lima');
  const weekly = { frequency: 'WEEKLY', interval: 1 } as const;
  const anchor = clock.epochOf(wallFrom('2026-10-05T08:00:00'));

  test('lists the occurrences that start inside the window, the anchor included', () => {
    const found = occurrencesBetween({
      rule: weekly,
      anchor,
      from: clock.epochOf(wallFrom('2026-10-05T00:00:00')),
      to: clock.epochOf(wallFrom('2026-10-25T23:59:59')),
      clock,
      limit: 100,
    });
    expect(found.map((instant) => wallText(clock.wallOf(instant)))).toEqual([
      '2026-10-05T08:00:00',
      '2026-10-12T08:00:00',
      '2026-10-19T08:00:00',
    ]);
  });

  test('a window far after the start begins at its first occurrence, not a replay', () => {
    const found = occurrencesBetween({
      rule: weekly,
      anchor,
      from: clock.epochOf(wallFrom('2027-03-01T08:00:00')),
      to: clock.epochOf(wallFrom('2027-03-14T23:59:59')),
      clock,
      limit: 100,
    });
    expect(found.map((instant) => wallText(clock.wallOf(instant)))).toEqual([
      '2027-03-01T08:00:00',
      '2027-03-08T08:00:00',
    ]);
  });

  test('a window before the series, or a limit, keeps the list short', () => {
    expect(
      occurrencesBetween({ rule: weekly, anchor, from: anchor - 10_000, to: anchor - 1, clock, limit: 100 })
    ).toEqual([]);
    expect(
      occurrencesBetween({ rule: weekly, anchor, from: anchor, to: anchor + 365 * 86_400_000, clock, limit: 4 })
    ).toHaveLength(4);
  });

  test('the first occurrence after a moment is strictly after it', () => {
    expect(firstOccurrenceAfter({ rule: weekly, anchor, moment: anchor, clock })).toBe(
      clock.epochOf(wallFrom('2026-10-12T08:00:00'))
    );
    expect(firstOccurrenceAfter({ rule: weekly, anchor, moment: anchor - 1, clock })).toBe(anchor);
  });

  test('the same time tomorrow keeps the wall clock of the zone, as the backend snooze does', () => {
    const newYork = clockIn('America/New_York');
    const saturday = newYork.epochOf(wallFrom('2026-03-07T08:00:00'));
    expect(wallText(newYork.wallOf(sameTimeTomorrow(saturday, newYork)))).toBe('2026-03-08T08:00:00');
    expect(sameTimeTomorrow(saturday, newYork) - saturday).toBe(23 * 3_600_000);
    expect(wallText(clock.wallOf(sameTimeTomorrow(clock.epochOf(wallFrom('2026-12-31T21:15:30')), clock)))).toBe(
      '2027-01-01T21:15:30'
    );
  });

  test('an unknown zone falls back to the device clock', () => {
    expect(intlZoneClock('Mars/Olympus_Mons')).toBeNull();
    const local = zoneClock('Mars/Olympus_Mons');
    const at = new Date(2026, 9, 5, 8, 0, 0).getTime();
    expect(local.epochOf(local.wallOf(at))).toBe(at);
  });
});

describe('the zone clock caches each zone offset change', () => {
  const HOUR_MS = 3_600_000;
  const AWKWARD_ZONES = [
    'Europe/Madrid',
    'America/New_York',
    'Australia/Lord_Howe',
    'Asia/Kathmandu',
    'Pacific/Chatham',
    'Africa/Casablanca',
    'America/Sao_Paulo',
  ];

  for (const zone of AWKWARD_ZONES) {
    test(`${zone}: the cached wall time is the formatter's at every probe over two years`, () => {
      const reader = zoneWallReader(zone);
      if (!reader) throw new Error(`this runtime does not know the zone ${zone}`);
      const clock = clockIn(zone);
      const from = Date.UTC(2026, 0, 1);
      const to = Date.UTC(2028, 0, 1);
      for (let at = from; at < to; at += 97 * 60_000 + 13_000) {
        expect(wallText(clock.wallOf(at))).toBe(wallText(reader(at)));
      }
    });
  }

  test('an offset change is placed to the second', () => {
    const newYork = clockIn('America/New_York');
    const spring = Date.UTC(2026, 2, 8, 7, 0, 0);
    expect(wallText(newYork.wallOf(spring - 1000))).toBe('2026-03-08T01:59:59');
    expect(wallText(newYork.wallOf(spring))).toBe('2026-03-08T03:00:00');
    const autumn = Date.UTC(2026, 10, 1, 6, 0, 0);
    expect(wallText(newYork.wallOf(autumn - 1000))).toBe('2026-11-01T01:59:59');
    expect(wallText(newYork.wallOf(autumn))).toBe('2026-11-01T01:00:00');
    const lordHowe = clockIn('Australia/Lord_Howe');
    const halfHour = Date.UTC(2026, 3, 4, 15, 0, 0);
    expect(newYork.epochOf(wallFrom('2026-03-08T02:30:00'))).toBe(spring + 30 * 60_000);
    expect(newYork.epochOf(wallFrom('2026-11-01T01:30:00'))).toBe(autumn - 30 * 60_000);
    expect(lordHowe.wallOf(halfHour - 1000).minute).toBe(59);
    expect(lordHowe.epochOf(lordHowe.wallOf(halfHour + HOUR_MS))).toBe(halfHour + HOUR_MS);
  });
});

describe('monthly on a day of the month', () => {
  const en = ((key: string, params?: Record<string, string | number>) =>
    translate(localeDictionaries.en, key as never, params as never)) as TranslateFn;

  test('reads and writes BYMONTHDAY for a monthly rule only, as the backend does', () => {
    expect(parseRecurrenceRule('FREQ=MONTHLY;BYMONTHDAY=31')).toEqual({ frequency: 'MONTHLY', interval: 1, monthDay: 31 });
    expect(parseRecurrenceRule('BYMONTHDAY=5;INTERVAL=2;FREQ=MONTHLY')).toEqual({
      frequency: 'MONTHLY',
      interval: 2,
      monthDay: 5,
    });
    expect(parseRecurrenceRule('FREQ=WEEKLY;BYMONTHDAY=5')).toBeNull();
    expect(parseRecurrenceRule('FREQ=MONTHLY;BYMONTHDAY=32')).toBeNull();
    expect(formatRecurrenceRule({ frequency: 'MONTHLY', interval: 1, monthDay: 31 })).toBe('FREQ=MONTHLY;BYMONTHDAY=31');
    expect(formatRecurrenceRule({ frequency: 'MONTHLY', interval: 3, monthDay: 5 })).toBe(
      'FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=5'
    );
    expect(formatRecurrenceRule({ frequency: 'WEEKLY', interval: 1, monthDay: 5 })).toBe('FREQ=WEEKLY');
  });

  test('the day 31 falls on the last day of a shorter month and comes back', () => {
    const clock = clockIn('America/Lima');
    const rule = parseRecurrenceRule('FREQ=MONTHLY;BYMONTHDAY=31');
    expect(rule).not.toBeNull();
    if (!rule) return;
    const anchor = clock.epochOf(wallFrom('2027-01-10T09:00:00'));
    const found = occurrencesBetween({
      rule,
      anchor,
      from: anchor,
      to: clock.epochOf(wallFrom('2027-04-30T23:59:59')),
      clock,
      limit: 10,
    });
    expect(found.map((instant) => wallText(clock.wallOf(instant)))).toEqual([
      '2027-01-31T09:00:00',
      '2027-02-28T09:00:00',
      '2027-03-31T09:00:00',
      '2027-04-30T09:00:00',
    ]);
  });

  test('names the day in the user language', () => {
    expect(recurrenceLabel('FREQ=MONTHLY;BYMONTHDAY=5', es)).toBe('Cada mes, el día 5');
    expect(recurrenceLabel('FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=31', es)).toBe('Cada 2 meses, el día 31');
    expect(recurrenceLabel('FREQ=MONTHLY;BYMONTHDAY=5', en)).toBe('Every month on day 5');
    expect(recurrenceLabel('FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=31', en)).toBe('Every 2 months on day 31');
  });
});
