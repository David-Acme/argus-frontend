import { describe, expect, test } from 'bun:test';
import { presenceOverviewSchema } from '@/core/contracts/presence.contract';
import { presenceOf } from '@/features/people/model/presence';

const answer = {
  people: [
    {
      userId: 7,
      state: 'home',
      since: 1790000000,
      environments: [{ environmentId: 1, state: 'home', since: 1790000000 }],
    },
    { userId: 8, state: 'away', since: 1789000000, environments: [] },
  ],
};

describe('the presence the owner reads', () => {
  test('accepts the answer argus-guard gives', () => {
    expect(presenceOverviewSchema.safeParse(answer).success).toBe(true);
    expect(presenceOverviewSchema.safeParse({ people: [] }).success).toBe(true);
  });

  test('refuses an unknown state or a bad id, and keeps no source', () => {
    expect(
      presenceOverviewSchema.safeParse({ people: [{ userId: 7, state: 'gps', since: 1, environments: [] }] }).success
    ).toBe(false);
    expect(
      presenceOverviewSchema.safeParse({ people: [{ userId: 0, state: 'home', since: 1, environments: [] }] }).success
    ).toBe(false);
    const strict = presenceOverviewSchema.parse({
      people: [{ userId: 7, state: 'home', since: 1, source: 'lan_session', environments: [] }],
    });
    expect(Object.keys(strict.people[0] ?? {})).toEqual(['userId', 'state', 'since', 'environments']);
  });
});

describe('the chip of one person', () => {
  const overview = presenceOverviewSchema.parse(answer);

  test('a person without a row is unknown, never away', () => {
    expect(presenceOf(overview, 99, new Date())).toEqual({ state: 'unknown', sinceKind: 'none', since: null });
    expect(presenceOf(null, 7, new Date()).state).toBe('unknown');
  });

  test('a change of today shows the time, an older one the day', () => {
    const sameDay = new Date(1790000000 * 1000 + 60_000);
    const home = presenceOf(overview, 7, sameDay);
    expect(home.state).toBe('home');
    expect(home.sinceKind).toBe('today');
    expect(home.since?.getTime()).toBe(1790000000 * 1000);
    const away = presenceOf(overview, 8, new Date(1790000000 * 1000 + 3 * 86_400_000));
    expect(away.state).toBe('away');
    expect(away.sinceKind).toBe('day');
  });

  test('a state without a time shows only the state', () => {
    const zero = presenceOverviewSchema.parse({ people: [{ userId: 9, state: 'away', since: 0, environments: [] }] });
    expect(presenceOf(zero, 9, new Date())).toEqual({ state: 'away', sinceKind: 'none', since: null });
  });
});
