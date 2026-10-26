import { describe, expect, test } from 'bun:test';
import type { HomePerson } from '@/features/home';
import {
  activeNames,
  householdSummary,
  joinNames,
  pendingInvitations,
} from '@/features/profile/model/household';

const person = (patch: Partial<HomePerson>): HomePerson => ({
  id: '1',
  name: 'Ana',
  initial: 'A',
  self: false,
  state: 'home',
  since: null,
  ...patch,
});

const LEFT = new Date(2026, 9, 26, 9, 10);

describe('householdSummary', () => {
  test('you and who else is at home, and who left last', () => {
    const summary = householdSummary([
      person({ id: '1', name: 'David', self: true }),
      person({ id: '2', name: 'Luis' }),
      person({ id: '3', name: 'Rosa', state: 'away', since: LEFT }),
    ]);
    expect(summary.title).toEqual({ kind: 'you', others: ['Luis'] });
    expect(summary.meta).toEqual({ kind: 'left', name: 'Rosa', since: LEFT });
  });

  test('alone in Argus, nobody at home, and everyone at home read as such', () => {
    expect(householdSummary([person({ self: true })]).title).toEqual({ kind: 'alone' });
    const away = [
      person({ self: true, state: 'away' }),
      person({ id: '2', name: 'Luis', state: 'away' }),
    ];
    expect(householdSummary(away)).toEqual({
      title: { kind: 'nobody' },
      meta: { kind: 'away', names: ['Ana', 'Luis'] },
    });
    const home = [person({ self: true }), person({ id: '2', name: 'Luis' })];
    expect(householdSummary(home).meta).toEqual({ kind: 'everyone' });
  });

  test('others at home without you', () => {
    const people = [person({ self: true, state: 'away' }), person({ id: '2', name: 'Luis' })];
    expect(householdSummary(people).title).toEqual({ kind: 'others', others: ['Luis'] });
  });
});

describe('the household lines', () => {
  test('active first names only, never an empty one', () => {
    expect(
      activeNames([
        { name: 'Ana', lastName: 'Ruiz', isActive: true },
        { name: ' ', lastName: 'Soto', isActive: true },
        { name: 'Jorge', lastName: '', isActive: false },
      ])
    ).toEqual(['Ana', 'Soto']);
  });

  test('a pending invitation is open, unused and unexpired', () => {
    const open = { revokedAt: null, redemptionCount: 0, maxRedemptions: 1, expiresAt: 200 };
    expect(
      pendingInvitations(
        [
          open,
          { ...open, revokedAt: 5 },
          { ...open, redemptionCount: 1 },
          { ...open, expiresAt: 50 },
        ],
        100
      )
    ).toBe(1);
  });

  test('names join with the conjunction before the last', () => {
    expect(joinNames([], 'y')).toBe('');
    expect(joinNames(['Luis'], 'y')).toBe('Luis');
    expect(joinNames(['Luis', 'Rosa', 'Ana'], 'y')).toBe('Luis, Rosa y Ana');
  });
});
