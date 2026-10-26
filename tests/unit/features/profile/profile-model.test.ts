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

  test('counts what was done on its day and what is still due this week', () => {
    const at = (day: number, hour: number) => new Date(2026, 9, day, hour).getTime();
    const stats = weekStats(
      [
        { scheduledAt: at(20, 9), isCompleted: true, completedAt: at(20, 8) },
        { scheduledAt: at(21, 9), isCompleted: true, completedAt: at(23, 9) },
        { scheduledAt: at(24, 9), isCompleted: false, completedAt: null },
        { scheduledAt: at(12, 9), isCompleted: true, completedAt: at(12, 10) },
        { scheduledAt: at(30, 9), isCompleted: false, completedAt: null },
      ],
      week
    );
    expect(stats).toEqual({ onTime: 1, pending: 1 });
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
