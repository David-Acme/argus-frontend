import { describe, expect, test } from 'bun:test';
import {
  authSessionListSchema,
  readSessionSignal,
  sessionRevokeResultSchema,
  userSessionsOverviewSchema,
} from '@/core/contracts/session.contract';
import { endNoticeOf } from '@/core/services/sync/session-end-notice';

const ID = '0123456789abcdef0123456789abcdef';
const OTHER = 'fedcba9876543210fedcba9876543210';

const session = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: ID,
  platform: 'desktop',
  deviceName: 'master',
  createdAt: 1_790_000_000,
  lastSeenAt: 1_790_000_600,
  expiresAt: 1_792_592_000,
  current: true,
  ...overrides,
});

describe('GET /auth/sessions', () => {
  test('the contract sample parses', () => {
    const sample = {
      sessions: [
        session(),
        session({ id: OTHER, platform: 'android', deviceName: null, current: false }),
        session({ id: 'a'.repeat(32), platform: 'unknown', current: false }),
      ],
    };
    expect(authSessionListSchema.parse(sample) as unknown).toEqual(sample);
  });

  test('an empty list is valid', () => {
    expect(authSessionListSchema.parse({ sessions: [] })).toEqual({ sessions: [] });
  });

  test('tokens, row ids and unknown platforms are not part of the shape', () => {
    expect(
      authSessionListSchema.safeParse({ sessions: [session({ platform: 'tablet' })] }).success
    ).toBe(false);
    expect(authSessionListSchema.safeParse({ sessions: [session({ id: 42 })] }).success).toBe(
      false
    );
    expect(authSessionListSchema.safeParse({ sessions: [session({ id: 'ABC' })] }).success).toBe(
      false
    );
    expect(
      authSessionListSchema.safeParse({ sessions: [session({ lastSeenAt: '1' })] }).success
    ).toBe(false);
    const extra = authSessionListSchema.parse({ sessions: [session({ refreshToken: 'secret' })] });
    expect(extra.sessions[0]).not.toHaveProperty('refreshToken');
  });
});

describe('GET /auth/users/sessions', () => {
  test('every user with an open session, each with its sessions', () => {
    const sample = {
      users: [
        { userId: 4, sessions: [session({ current: false })] },
        { userId: 1, sessions: [session({ id: OTHER }), session({ id: 'b'.repeat(32), current: false })] },
      ],
    };
    expect(userSessionsOverviewSchema.parse(sample) as unknown).toEqual(sample);
    expect(userSessionsOverviewSchema.parse({ users: [] })).toEqual({ users: [] });
    expect(userSessionsOverviewSchema.safeParse({ users: [{ userId: 0, sessions: [] }] }).success).toBe(
      false
    );
    expect(userSessionsOverviewSchema.safeParse({ users: [{ userId: 2 }] }).success).toBe(false);
  });
});

describe('DELETE /auth/sessions', () => {
  test('one, others and all answer the revoked ids and whether the caller was among them', () => {
    expect(sessionRevokeResultSchema.parse({ revoked: [OTHER], current: false })).toEqual({
      revoked: [OTHER],
      current: false,
    });
    expect(sessionRevokeResultSchema.parse({ revoked: [ID, OTHER], current: true }).current).toBe(
      true
    );
    expect(sessionRevokeResultSchema.parse({ revoked: [], current: false }).revoked).toEqual([]);
    expect(sessionRevokeResultSchema.safeParse({ revoked: ['x'], current: false }).success).toBe(
      false
    );
    expect(sessionRevokeResultSchema.safeParse({ revoked: [] }).success).toBe(false);
  });
});

describe('AuthContextChanged session frames', () => {
  test('sessionRevoked carries the session id and why, when the server says', () => {
    expect(readSessionSignal({ reason: 'sessionRevoked', sessionId: ID, resync: false })).toEqual({
      reason: 'sessionRevoked',
      sessionId: ID,
      cause: null,
    });
    expect(
      readSessionSignal({ reason: 'sessionRevoked', sessionId: ID, cause: 'accountDisabled' })
    ).toEqual({ reason: 'sessionRevoked', sessionId: ID, cause: 'accountDisabled' });
    expect(
      readSessionSignal({ reason: 'sessionRevoked', sessionId: ID, cause: 'somethingNew' })
    ).toEqual({ reason: 'sessionRevoked', sessionId: ID, cause: null });
  });

  test('the cause picks the notice the signed-out device shows', () => {
    expect(endNoticeOf(null)).toBe('closed-here');
    expect(endNoticeOf('revoked')).toBe('closed-here');
    expect(endNoticeOf('refreshTokenReuse')).toBe('closed-here');
    expect(endNoticeOf('revokedByOwner')).toBe('closed-by-owner');
    expect(endNoticeOf('accountDisabled')).toBe('account-disabled');
  });

  test('userSessionsChanged names the user whose sessions moved', () => {
    expect(readSessionSignal({ reason: 'userSessionsChanged', userId: 7, resync: false })).toEqual({
      reason: 'userSessionsChanged',
      userId: 7,
    });
    expect(readSessionSignal({ reason: 'userSessionsChanged' })).toBeNull();
    expect(readSessionSignal({ reason: 'userSessionsChanged', userId: '7' })).toBeNull();
  });

  test('sessionsChanged carries nothing else', () => {
    expect(readSessionSignal({ reason: 'sessionsChanged', resync: false })).toEqual({
      reason: 'sessionsChanged',
    });
  });

  test('a role change, an unknown reason or a malformed id is not a session signal', () => {
    expect(
      readSessionSignal({ id: 1, name: 'Ana', role: 'owner', isActive: true, resync: true })
    ).toBeNull();
    expect(readSessionSignal({ reason: 'roleChanged' })).toBeNull();
    expect(readSessionSignal({ reason: 'sessionRevoked' })).toBeNull();
    expect(readSessionSignal({ reason: 'sessionRevoked', sessionId: 'nope' })).toBeNull();
    expect(readSessionSignal(null)).toBeNull();
  });
});
