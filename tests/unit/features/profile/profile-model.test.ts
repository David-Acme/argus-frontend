import { describe, expect, test } from 'bun:test';
import { heroLookOf } from '@/features/profile/model/hero-look';
import { homeSteps } from '@/features/profile/model/home-steps';
import { deviceKindOf, factsOf, initialsOf } from '@/features/profile/model/profile-hero';
import { weekOf, weekStats } from '@/features/profile/model/week-stats';

describe('homeSteps', () => {
  test('only real steps count, and done ones leave the cards', () => {
    expect(
      homeSteps({ invite: { applies: true, done: true }, camera: { applies: true, done: false } })
    ).toEqual({ pending: ['camera'], done: 1, total: 2, started: true });
    expect(
      homeSteps({ invite: { applies: true, done: false }, camera: { applies: false, done: false } })
    ).toEqual({ pending: ['invite'], done: 0, total: 1, started: false });
  });
});

describe('the profile hero', () => {
  test('initials take the first and last word', () => {
    expect(initialsOf('David Acme')).toBe('DA');
    expect(initialsOf('  ana  ')).toBe('A');
    expect(initialsOf('María José de la Cruz')).toBe('MC');
    expect(initialsOf('')).toBe('');
  });

  test('facts show only what the role can open', () => {
    expect(
      factsOf({ people: { count: 3, href: '/users' }, cameras: 5, devices: 4 }).map(
        (fact) => fact.key
      )
    ).toEqual(['people', 'cameras', 'devices']);
    expect(factsOf({ people: null, cameras: null, devices: 2 })).toEqual([
      { key: 'devices', value: 2, href: '/profile/sessions' },
    ]);
  });

  test('the device says what it is in words', () => {
    expect(deviceKindOf('android')).toBe('phone');
    expect(deviceKindOf('desktop')).toBe('computer');
    expect(deviceKindOf('web')).toBe('browser');
    expect(deviceKindOf('unknown')).toBeNull();
    expect(deviceKindOf(null)).toBeNull();
  });
});

describe('the week', () => {
  const sunday = new Date(2026, 9, 25, 18, 0);
  const week = weekOf(sunday);

  test('runs from Monday to Sunday', () => {
    expect(week.from.getDay()).toBe(1);
    expect(week.from.getDate()).toBe(19);
    expect(week.to.getDate()).toBe(25);
  });

  test('counts the tasks due this week that are done and those still open', () => {
    const at = (day: number) => new Date(2026, 9, day).getTime();
    const stats = weekStats(
      [
        { status: 'done', dueAt: at(20) },
        { status: 'done', dueAt: at(25) },
        { status: 'todo', dueAt: at(24) },
        { status: 'doing', dueAt: at(19) },
        { status: 'canceled', dueAt: at(22) },
        { status: 'done', dueAt: at(12) },
        { status: 'todo', dueAt: at(30) },
        { status: 'todo', dueAt: null },
      ],
      week
    );
    expect(stats).toEqual({ done: 2, pending: 2 });
  });
});

describe('the hero on short windows', () => {
  test('a tall phone and any split window keep the full hero', () => {
    expect(heroLookOf('regular', false).portrait).toBe('portrait');
    expect(heroLookOf('tiny', true).facts).toBe(true);
  });

  test('a short or tiny phone shrinks the portrait, folds where you are under the role and leaves the counts to their screens', () => {
    for (const height of ['short', 'tiny'] as const)
      expect(heroLookOf(height, false)).toEqual({
        portrait: 'large',
        name: 'heroSecondary',
        inlineWhere: true,
        facts: false,
        compact: true,
      });
  });
});
