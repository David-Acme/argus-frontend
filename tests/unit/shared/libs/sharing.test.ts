import { describe, expect, test } from 'bun:test';
import type { IPeopleDirectoryCacheRow } from '@/core/interfaces';
import { personFullName, shareCandidates } from '@/shared/libs/sharing';

const person = (id: string, role: IPeopleDirectoryCacheRow['role'], isActive = true): IPeopleDirectoryCacheRow => ({
  id,
  name: `P${id}`,
  lastName: '',
  role,
  isActive,
  createdAt: 0,
  updatedAt: 0,
});

describe('share candidates', () => {
  const people = [
    person('1', 'owner'),
    person('2', 'resident'),
    person('5', 'resident'),
    person('6', 'resident', false),
    person('7', 'guard'),
    person('8', 'guest'),
  ];

  test('an active person who can read the table and is not already shared is a candidate', () => {
    expect(shareCandidates({ table: 'project', ownerId: '1', shared: [{ userId: '2' }], people }).map((p) => p.id)).toEqual([
      '5',
    ]);
    expect(shareCandidates({ table: 'calendar_event', ownerId: '1', shared: [], people }).map((p) => p.id)).toEqual([
      '2',
      '5',
    ]);
  });

  test('a guard or a guest never reads the tables that are shared, so they are never offered', () => {
    expect(
      shareCandidates({ table: 'calendar_event', ownerId: '9', shared: [], people }).map((p) => p.id),
    ).not.toContain('7');
    expect(shareCandidates({ table: 'project', ownerId: '9', shared: [], people }).map((p) => p.id)).not.toContain('8');
  });
});

describe('person full name', () => {
  test('joins the given name and the last name, and skips an empty last name', () => {
    expect(personFullName({ name: 'Luis', lastName: 'Paz' })).toBe('Luis Paz');
    expect(personFullName({ name: 'Luis', lastName: '' })).toBe('Luis');
  });
});
