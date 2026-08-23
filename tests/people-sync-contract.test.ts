import { describe, expect, test } from 'bun:test';
import { peopleAccessForRole } from '../src/shared/libs/people-access';

describe('peopleAccessForRole', () => {
  test('gives the owner management and invitation projections', () => {
    expect(peopleAccessForRole('owner')).toEqual({
      profileAction: 'manage',
      receivesDirectory: true,
      receivesInvitations: true,
    });
  });

  test('gives a guard the local directory but never invitation data', () => {
    expect(peopleAccessForRole('guard')).toEqual({
      profileAction: 'directory',
      receivesDirectory: true,
      receivesInvitations: false,
    });
  });

  test('limits residents and guests to their own profile', () => {
    expect(peopleAccessForRole('resident')).toEqual({
      profileAction: null,
      receivesDirectory: false,
      receivesInvitations: false,
    });
    expect(peopleAccessForRole('guest')).toEqual({
      profileAction: null,
      receivesDirectory: false,
      receivesInvitations: false,
    });
  });
});
