import { describe, expect, test } from 'bun:test';
import type { IPeopleDirectoryCacheRow } from '@/core/interfaces';
import type { PresenceOverview } from '@/core/types';
import { homePeopleOf, homeSinceOf } from '@/features/home/model/home-people';

const person = (
  id: string,
  name: string,
  extra: Partial<IPeopleDirectoryCacheRow> = {}
): IPeopleDirectoryCacheRow => ({
  id,
  name,
  lastName: '',
  role: 'resident',
  isActive: true,
  createdAt: 0,
  updatedAt: 0,
  ...extra,
});

const at = (hours: number, minutes = 0): number =>
  new Date(2026, 9, 26, hours, minutes).getTime() / 1000;

const overview: PresenceOverview = {
  people: [
    { userId: 1, state: 'home', since: at(13, 10), environments: [] },
    { userId: 2, state: 'home', since: at(14, 45), environments: [] },
    { userId: 3, state: 'away', since: at(9, 10), environments: [] },
    { userId: 4, state: 'unknown', since: at(8), environments: [] },
  ],
};

describe('who is home', () => {
  test('home first with me first among them, then away, then unknown, each by name', () => {
    const people = homePeopleOf(
      [
        person('3', 'Carlos'),
        person('2', 'Luis'),
        person('4', 'Rosa'),
        person('1', 'Ana'),
        person('5', 'Beto'),
      ],
      overview,
      '1'
    );
    expect(people.map(({ name, state, self }) => [name, state, self])).toEqual([
      ['Ana', 'home', true],
      ['Luis', 'home', false],
      ['Carlos', 'away', false],
      ['Beto', 'unknown', false],
      ['Rosa', 'unknown', false],
    ]);
  });

  test('I come first even when someone else arrived earlier', () => {
    const people = homePeopleOf([person('2', 'Luis'), person('1', 'Ana')], overview, '2');
    expect(people.map(({ name }) => name)).toEqual(['Luis', 'Ana']);
  });

  test('a known state carries its since; unknown, missing or zero carries none', () => {
    const people = homePeopleOf(
      [person('1', 'Ana'), person('4', 'Rosa'), person('9', 'Nadie')],
      { people: [...overview.people, { userId: 9, state: 'home', since: 0, environments: [] }] },
      '1'
    );
    expect(people.find(({ id }) => id === '1')?.since).toEqual(new Date(at(13, 10) * 1000));
    expect(people.find(({ id }) => id === '4')?.since).toBeNull();
    expect(people.find(({ id }) => id === '9')?.since).toBeNull();
  });

  test('an inactive or nameless account is left out, and a last name stands in for a missing name', () => {
    const people = homePeopleOf(
      [
        person('1', 'Ana', { isActive: false }),
        person('2', ' ', { lastName: 'Quispe' }),
        person('3', ''),
      ],
      overview,
      '1'
    );
    expect(people.map(({ name, initial }) => [name, initial])).toEqual([['Quispe', 'Q']]);
  });
});

describe('how the since reads', () => {
  const now = new Date(2026, 9, 26, 15, 0);

  test('today shows the time, another day the date, and no since only the state', () => {
    expect(homeSinceOf({ since: new Date(2026, 9, 26, 9, 10) }, now)).toBe('today');
    expect(homeSinceOf({ since: new Date(2026, 9, 25, 22, 0) }, now)).toBe('day');
    expect(homeSinceOf({ since: null }, now)).toBe('none');
  });
});
