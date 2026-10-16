import { describe, expect, test } from 'bun:test';
import {
  decideRestore,
  nullStoredKeys,
  restoreEntryOf,
  restoreFailureOf,
  restoreReport,
  restoreRetryDelayMs,
  RESTORE_READ_ATTEMPTS,
  RESTORE_RETRY_CAP_MS,
  type StoredSessionReading,
} from '@/core/services/session-restore';
import { traceReasonOf } from '@/core/services/native-trace-reason';

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

describe('the restore report names the exact cause of a session that disappeared', () => {
  test('a complete stored session restores and traces nothing else', () => {
    const report = restoreReport({ reading: whole, failures: [] });
    expect(report.cause).toBe('session');
    expect(report.outcome).toBe('ok');
    expect(report.reason).toBe('session');
    expect(report.lostKeys).toEqual([]);
    expect(report.warnings).toEqual([]);
  });

  test('an empty store is a fresh install, not a lost session', () => {
    const report = restoreReport({
      reading: { instance: null, accessToken: null, refreshToken: null, deviceCredential: null, user: null },
      failures: [],
    });
    expect(report.cause).toBe('fresh');
    expect(report.outcome).toBe('absent');
    expect(report.reason).toBe('none');
  });

  test('a remembered account whose session secrets are gone is a vanished session', () => {
    const report = restoreReport({
      reading: { ...whole, accessToken: null, refreshToken: null, deviceCredential: null },
      failures: [],
    });
    expect(report.cause).toBe('vanished');
    expect(report.outcome).toBe('error');
    expect(report.reason).toBe('keystore-lost-access-token-refresh-token-device-credential');
    expect(report.lostKeys).toEqual(['access-token', 'refresh-token', 'device-credential']);
  });

  test('a vanished session names only the secrets that came back empty', () => {
    const report = restoreReport({ reading: { ...whole, refreshToken: null }, failures: [] });
    expect(report.cause).toBe('vanished');
    expect(report.reason).toBe('keystore-lost-refresh-token');
    expect(report.lostKeys).toEqual(['refresh-token']);
  });

  test('every warning logs the SecureStoreModule warning and the key name, never a value', () => {
    const report = restoreReport({
      reading: { ...whole, accessToken: null, refreshToken: null },
      failures: [],
    });
    expect(report.warnings).toHaveLength(2);
    const [access, refresh] = report.warnings;
    expect(access).toContain('SecureStoreModule (ExpoSecureStore)');
    expect(access).toContain("key 'net.accessToken'");
    expect(refresh).toContain("key 'net.refreshToken'");
    expect(report.warnings.join(' ')).not.toContain('refresh-value');
  });

  test('a lost pairing with its session intact is unpaired, not vanished', () => {
    const report = restoreReport({ reading: { ...whole, instance: null }, failures: [] });
    expect(report.cause).toBe('unpaired');
    expect(report.outcome).toBe('partial');
    expect(report.reason).toBe('instance');
    expect(report.lostKeys).toEqual([]);
  });

  test('a paired device whose secrets are gone is a vanished session, its user row backed up or not', () => {
    const report = restoreReport({
      reading: { instance, accessToken: null, refreshToken: null, deviceCredential: null, user: null },
      failures: [],
    });
    expect(report.cause).toBe('vanished');
    expect(report.reason).toBe('keystore-lost-access-token-refresh-token-device-credential');
    expect(report.warnings).toHaveLength(3);
  });

  test('a stored session without its user row is incomplete', () => {
    const report = restoreReport({ reading: { ...whole, user: null }, failures: [] });
    expect(report.cause).toBe('incomplete');
    expect(report.outcome).toBe('partial');
    expect(report.reason).toBe('user');
  });

  test('an empty pairing with no user and no tokens names every lost key', () => {
    const report = restoreReport({
      reading: { instance: null, accessToken: null, refreshToken: null, deviceCredential: 'credential', user: null },
      failures: [],
    });
    expect(report.cause).toBe('unpaired');
    expect(report.reason).toBe('instance-access-token-refresh-token-user');
    expect(report.warnings).toEqual([]);
  });

  test('every traced reason survives the trace shape', () => {
    const readings: StoredSessionReading[] = [
      whole,
      { instance: null, accessToken: null, refreshToken: null, deviceCredential: null, user: null },
      { ...whole, accessToken: null, refreshToken: null, deviceCredential: null },
      { ...whole, refreshToken: null },
      { ...whole, instance: null },
      { ...whole, user: null },
    ];
    for (const reading of readings) {
      const report = restoreReport({ reading, failures: [] });
      expect(traceReasonOf(report.reason)).toBe(report.reason);
      expect(report.reason.length).toBeLessThanOrEqual(64);
    }
  });
});

describe('a refused read maps to the keystore cause and the key the library names', () => {
  test('a failed decryption names the key and the module', () => {
    const failure = restoreFailureOf(
      new Error(
        "Could not decrypt the value for key 'net.accessToken' under keychain 'undefined'. Caused by: Failed to decrypt the entry",
      ),
    );
    expect(failure.kind).toBe('decrypt');
    expect(failure.key).toBe('net.accessToken');
  });

  test('a keystore access failure is a keystore cause', () => {
    const failure = restoreFailureOf(
      new Error(
        "Could not decrypt the value for key 'net.refreshToken' under keychain 'undefined'. Caused by: An error occurred when accessing the keystore: KeyStore is not initialized",
      ),
    );
    expect(failure.kind).toBe('keystore');
    expect(failure.key).toBe('net.refreshToken');
  });

  test('an unknown refusal keeps the message and names no key', () => {
    const failure = restoreFailureOf(new Error('something else went wrong'));
    expect(failure).toEqual({ kind: 'unknown', key: null, message: 'something else went wrong' });
  });

  test('a read that never succeeds becomes an unreadable session, its key and kind in the reason', () => {
    const report = restoreReport({
      reading: null,
      failures: [
        restoreFailureOf(new Error("Could not decrypt the value for key 'net.accessToken' under keychain 'undefined'")),
      ],
    });
    expect(report.cause).toBe('unreadable');
    expect(report.outcome).toBe('error');
    expect(report.reason).toBe('securestore-decrypt-access-token');
    expect(report.warnings[0]).toContain('SecureStoreModule (ExpoSecureStore)');
    expect(report.warnings[0]).toContain("key 'net.accessToken'");
  });

  test('a refusal the library does not name keeps a session reason', () => {
    const report = restoreReport({
      reading: null,
      failures: [restoreFailureOf('the native module is unavailable')],
    });
    expect(report.reason).toBe('securestore-unknown-session');
    expect(report.warnings).toHaveLength(1);
  });

  test('the read attempts are bounded', () => {
    expect(RESTORE_READ_ATTEMPTS).toBeGreaterThan(1);
    expect(RESTORE_READ_ATTEMPTS).toBeLessThanOrEqual(5);
  });
});

describe('a paired device that lost its session goes straight to the face screen', () => {
  test('a vanished session re-enters with the face copy', () => {
    expect(restoreEntryOf({ paired: true, cause: 'vanished' })).toBe('restore');
  });

  test('a refused read on a paired device re-enters with the face copy, never the plain login copy', () => {
    expect(restoreEntryOf({ paired: true, cause: 'unreadable' })).toBe('restore');
  });

  test('an incomplete restore of a paired device re-enters with the face copy', () => {
    expect(restoreEntryOf({ paired: true, cause: 'incomplete' })).toBe('restore');
  });

  test('an unpaired device is a login without the restore copy', () => {
    expect(restoreEntryOf({ paired: false, cause: 'vanished' })).toBe('login');
    expect(restoreEntryOf({ paired: false, cause: 'fresh' })).toBe('login');
  });

  test('a healthy session or a fresh install is a plain login', () => {
    expect(restoreEntryOf({ paired: true, cause: 'session' })).toBe('login');
    expect(restoreEntryOf({ paired: true, cause: 'fresh' })).toBe('login');
    expect(restoreEntryOf({ paired: true, cause: null })).toBe('login');
  });

  test('every cause is answered once', () => {
    const causes = ['session', 'fresh', 'vanished', 'unpaired', 'incomplete', 'unreadable'] as const;
    expect(causes.map((cause) => restoreEntryOf({ paired: true, cause }))).toEqual([
      'login',
      'login',
      'restore',
      'login',
      'restore',
      'restore',
    ]);
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
