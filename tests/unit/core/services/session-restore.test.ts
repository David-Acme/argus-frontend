import { describe, expect, test } from 'bun:test';
import {
  decideRestore,
  nullStoredKeys,
  restoreRetryDelayMs,
  RESTORE_RETRY_CAP_MS,
  type StoredSessionReading,
} from '@/core/services/session-restore';

const instance = { host: 'argus.local', ip: '192.168.1.10', port: 7042 } as unknown as StoredSessionReading['instance'];
const user = { id: 1, name: 'David' } as unknown as StoredSessionReading['user'];

const whole: StoredSessionReading = {
  instance,
  accessToken: 'access',
  refreshToken: 'refresh',
  deviceCredential: 'credential',
  user,
};

describe('the session restore decision', () => {
  test('a complete stored session is restored', () => {
    expect(decideRestore(whole)).toEqual({ kind: 'session' });
  });

  test('nothing stored at all is an absent session, not a partial one', () => {
    expect(
      decideRestore({ instance: null, accessToken: null, refreshToken: null, deviceCredential: null, user: null }),
    ).toEqual({ kind: 'absent' });
  });

  test('a stored session without its pairing is partial and says why', () => {
    expect(decideRestore({ ...whole, instance: null })).toEqual({ kind: 'partial', reason: 'missing-instance' });
  });

  test('a stored session with one token missing is partial, never absent', () => {
    expect(decideRestore({ ...whole, refreshToken: null })).toEqual({ kind: 'partial', reason: 'missing-tokens' });
    expect(decideRestore({ ...whole, accessToken: null })).toEqual({ kind: 'partial', reason: 'missing-tokens' });
  });

  test('a stored session without its user row is partial', () => {
    expect(decideRestore({ ...whole, user: null })).toEqual({ kind: 'partial', reason: 'missing-user' });
  });

  test('the device credential alone does not make a session restorable', () => {
    expect(decideRestore({ ...whole, instance: null, accessToken: null, refreshToken: null, user: null }).kind).toBe(
      'partial',
    );
  });
});

describe('the restore retry after a failed read', () => {
  test('the first retry waits a second and the wait doubles', () => {
    expect(restoreRetryDelayMs(1)).toBe(1_000);
    expect(restoreRetryDelayMs(2)).toBe(2_000);
    expect(restoreRetryDelayMs(3)).toBe(4_000);
  });

  test('the wait never grows past the cap', () => {
    expect(restoreRetryDelayMs(20)).toBe(RESTORE_RETRY_CAP_MS);
    expect(restoreRetryDelayMs(0)).toBe(1_000);
  });
});

describe('the restore trace names the stored keys that came back empty, never their values', () => {
  test('a complete read names nothing', () => {
    expect(nullStoredKeys(whole)).toEqual([]);
  });

  test('each empty key is named by its short name', () => {
    expect(nullStoredKeys({ ...whole, accessToken: null, refreshToken: null })).toEqual([
      'access-token',
      'refresh-token',
    ]);
    expect(nullStoredKeys({ ...whole, instance: null, user: null })).toEqual(['instance', 'user']);
  });

  test('the names never carry a value', () => {
    const names = nullStoredKeys({ ...whole, deviceCredential: null });
    expect(names).toEqual(['device-credential']);
    expect(names.join(' ')).not.toContain('credential-value');
  });
});
