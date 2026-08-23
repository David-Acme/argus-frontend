import { describe, expect, test } from 'bun:test';
import { parseAuthContext } from '../src/core/services/sync/auth-context';

describe('parseAuthContext', () => {
  test('accepts a live role update only for the signed-in user', () => {
    expect(
      parseAuthContext(
        {
          id: 42,
          name: 'Lucía',
          role: 'guard',
          isActive: true,
          resync: true,
        },
        42,
      ),
    ).toEqual({
      user: { id: 42, name: 'Lucía', role: 'guard', isActive: true },
      requiresResync: true,
    });
  });

  test('rejects a context event that belongs to another account', () => {
    expect(
      parseAuthContext(
        {
          id: 7,
          name: 'Unknown',
          role: 'owner',
          isActive: true,
          resync: true,
        },
        42,
      ),
    ).toBeNull();
  });

  test('keeps an inactive context from scheduling a data resync', () => {
    expect(
      parseAuthContext(
        {
          id: 42,
          name: 'Lucía',
          role: 'guard',
          isActive: false,
          resync: false,
        },
        42,
      ),
    ).toEqual({
      user: { id: 42, name: 'Lucía', role: 'guard', isActive: false },
      requiresResync: false,
    });
  });
});
