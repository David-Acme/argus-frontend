import { describe, expect, test } from 'bun:test';
import { clearInviteToken, holdInviteToken, readInviteToken } from '@/features/auth/model/invite-slot';

describe('invite token slot', () => {
  test('a held token can be read again until it is cleared', () => {
    holdInviteToken('abc', 1_000);
    expect(readInviteToken(2_000)).toBe('abc');
    expect(readInviteToken(3_000)).toBe('abc');
    clearInviteToken();
    expect(readInviteToken(3_000)).toBeNull();
  });

  test('a token expires after ten minutes', () => {
    holdInviteToken('abc', 0);
    expect(readInviteToken(10 * 60_000 - 1)).toBe('abc');
    expect(readInviteToken(10 * 60_000)).toBeNull();
    expect(readInviteToken(0)).toBeNull();
  });
});
