import { describe, expect, test } from 'bun:test';
import {
  ageOf,
  dayPart,
  heroLook,
  heroMeta,
  homeLine,
  inicioPhase,
} from '@/features/home/model/inicio-hero';

const BASE = { ready: true, offline: false, alert: false, mode: 'home' } as const;

describe('the Inicio hero phase', () => {
  test('before the context arrives the hero waits, whatever else is known', () => {
    expect(inicioPhase({ ...BASE, ready: false, alert: true, offline: true })).toBe('loading');
  });

  test('an open alert wins over a lost connection and over the mode', () => {
    expect(inicioPhase({ ...BASE, alert: true, offline: true, mode: 'night' })).toBe('alert');
  });

  test('offline wins over the mode', () => {
    expect(inicioPhase({ ...BASE, offline: true, mode: 'night' })).toBe('offline');
  });

  test('night, away and armed put Argus on watch; home and no mode are calm', () => {
    expect(inicioPhase({ ...BASE, mode: 'night' })).toBe('night');
    expect(inicioPhase({ ...BASE, mode: 'away' })).toBe('away');
    expect(inicioPhase({ ...BASE, mode: 'armed' })).toBe('away');
    expect(inicioPhase(BASE)).toBe('calm');
    expect(inicioPhase({ ...BASE, mode: null })).toBe('calm');
  });
});

describe('the hero look of each phase', () => {
  test('calm is idle on the calm aura', () => {
    expect(heroLook('calm')).toEqual({ tone: 'calm', presence: 'idle', aura: 'calm' });
  });

  test('night and away draw the on-watch arc on the duty aura', () => {
    expect(heroLook('night')).toEqual({ tone: 'calm', presence: 'watch', aura: 'duty' });
    expect(heroLook('away')).toEqual(heroLook('night'));
  });

  test('an alert turns tone, Estela and the aura to alert', () => {
    expect(heroLook('alert')).toEqual({ tone: 'alert', presence: 'alert', aura: 'alert' });
  });

  test('offline is grey: Estela off on the off aura', () => {
    expect(heroLook('offline')).toEqual({ tone: 'calm', presence: 'off', aura: 'off' });
  });
});

describe('the part of the day the greeting names', () => {
  test('morning from 5 to 11, afternoon from 12 to 19, evening otherwise', () => {
    expect(dayPart(4)).toBe('evening');
    expect(dayPart(5)).toBe('morning');
    expect(dayPart(11)).toBe('morning');
    expect(dayPart(12)).toBe('afternoon');
    expect(dayPart(19)).toBe('afternoon');
    expect(dayPart(20)).toBe('evening');
    expect(dayPart(0)).toBe('evening');
  });
});

describe('who is home', () => {
  test('the line names the others and whether the reader is home', () => {
    expect(homeLine({ me: true, others: ['Luis'] })).toEqual({
      kind: 'me-and-others',
      names: ['Luis'],
    });
    expect(homeLine({ me: false, others: ['Luis', 'Carlos'] })).toEqual({
      kind: 'others',
      names: ['Luis', 'Carlos'],
    });
    expect(homeLine({ me: true, others: [] })).toEqual({ kind: 'me' });
    expect(homeLine({ me: false, others: [] })).toEqual({ kind: 'nobody' });
  });
});

describe('the age of the last known data', () => {
  const now = 1_000_000_000;

  test('under a minute is now, then whole minutes, hours and days', () => {
    expect(ageOf(now - 59_000, now)).toEqual({ unit: 'now' });
    expect(ageOf(now - 10 * 60_000, now)).toEqual({ unit: 'minutes', count: 10 });
    expect(ageOf(now - 3 * 3_600_000 - 1, now)).toEqual({ unit: 'hours', count: 3 });
    expect(ageOf(now - 2 * 86_400_000, now)).toEqual({ unit: 'days', count: 2 });
  });

  test('a time in the future reads as now', () => {
    expect(ageOf(now + 5_000, now)).toEqual({ unit: 'now' });
  });
});

describe('the hero meta line', () => {
  const people = { kind: 'me-and-others', names: ['Luis'] } as const;

  test('the phone says the mode and who is home', () => {
    expect(
      heroMeta({ phase: 'calm', band: false, mode: 'home', people, newHousehold: false })
    ).toEqual([
      { kind: 'mode', mode: 'home', named: false },
      { kind: 'people', line: people },
    ]);
  });

  test('the band leads with the greeting and names the mode', () => {
    expect(
      heroMeta({ phase: 'calm', band: true, mode: 'home', people, newHousehold: false })
    ).toEqual([
      { kind: 'greeting' },
      { kind: 'mode', mode: 'home', named: true },
      { kind: 'people', line: people },
    ]);
  });

  test('at night Argus says it keeps watch', () => {
    expect(
      heroMeta({ phase: 'night', band: false, mode: 'night', people, newHousehold: false })
    ).toEqual([{ kind: 'mode', mode: 'night', named: true }, { kind: 'watching' }]);
  });

  test('an alert says how long ago and who is answering', () => {
    expect(
      heroMeta({ phase: 'alert', band: true, mode: 'home', people, newHousehold: false })
    ).toEqual([{ kind: 'age' }, { kind: 'headline' }]);
  });

  test('what the role cannot read is absent', () => {
    expect(
      heroMeta({ phase: 'calm', band: false, mode: null, people: null, newHousehold: false })
    ).toEqual([]);
  });

  test('a new household with no mode and nobody known asks for a camera, never a blank', () => {
    expect(
      heroMeta({ phase: 'calm', band: false, mode: null, people: null, newHousehold: true })
    ).toEqual([{ kind: 'connect' }]);
    expect(
      heroMeta({ phase: 'calm', band: true, mode: null, people: null, newHousehold: true })
    ).toEqual([{ kind: 'greeting' }, { kind: 'connect' }]);
  });
});
