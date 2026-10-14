import { describe, expect, test } from 'bun:test';
import { registrationBodyOf, unpairPush, type PushUnpairPort } from '@/core/services/push/push-registration';

const KEYS = { publicKey: 'A'.repeat(43), keyId: 'B'.repeat(22) };

const REGISTRATION = {
  token: 'fcm-token-1',
  keys: KEYS,
  platform: 'android',
  lang: 'es',
  provider: 'fcm' as const,
};

type Failing = 'storedToken' | 'unregister' | 'deleteToken' | 'deleteKeys';

function recorder(failing?: Failing, stored: string | null = 'fcm-token-1') {
  const calls: string[] = [];
  const boom = (step: Failing) => {
    if (failing === step) throw new Error(`${step} refused`);
  };
  const port: PushUnpairPort = {
    storedToken: async () => {
      boom('storedToken');
      return stored;
    },
    unregister: async (removal) => {
      boom('unregister');
      calls.push(`unregister:${removal.token}`);
    },
    deleteToken: async () => {
      boom('deleteToken');
      calls.push('deleteToken');
    },
    deleteKeys: async () => {
      boom('deleteKeys');
      calls.push('deleteKeys');
    },
  };
  return { port, calls };
}

describe('the registration body', () => {
  test('carries exactly the token, the platform, the language, the provider and the key pair', () => {
    expect(registrationBodyOf(REGISTRATION)).toEqual({
      token: 'fcm-token-1',
      platform: 'android',
      lang: 'es',
      provider: 'fcm',
      publicKey: KEYS.publicKey,
      keyId: KEYS.keyId,
    });
  });

  test('refuses a public key that is not 32 bytes of base64url', () => {
    expect(() =>
      registrationBodyOf({ ...REGISTRATION, keys: { publicKey: 'A'.repeat(42), keyId: KEYS.keyId } })
    ).toThrow();
    expect(() =>
      registrationBodyOf({ ...REGISTRATION, keys: { publicKey: `${'A'.repeat(42)}+`, keyId: KEYS.keyId } })
    ).toThrow();
  });

  test('refuses a key id that is not 16 bytes of base64url', () => {
    expect(() =>
      registrationBodyOf({ ...REGISTRATION, keys: { publicKey: KEYS.publicKey, keyId: 'B'.repeat(21) } })
    ).toThrow();
  });

  test('refuses a provider the contract does not name', () => {
    expect(() => registrationBodyOf({ ...REGISTRATION, provider: 'webpush' as 'fcm' })).toThrow();
  });
});

describe('the unpair order', () => {
  test('unregisters the stored token, deletes the FCM token, then deletes the keys', async () => {
    const { port, calls } = recorder();
    await unpairPush(port);
    expect(calls).toEqual(['unregister:fcm-token-1', 'deleteToken', 'deleteKeys']);
  });

  test('without a stored token there is nothing to unregister, and the keys still go', async () => {
    const { port, calls } = recorder(undefined, null);
    await unpairPush(port);
    expect(calls).toEqual(['deleteToken', 'deleteKeys']);
  });

  test('an unregister the home refuses does not stop the local cleanup', async () => {
    const { port, calls } = recorder('unregister');
    await unpairPush(port);
    expect(calls).toEqual(['deleteToken', 'deleteKeys']);
  });

  test('a failed FCM token deletion still deletes the keys', async () => {
    const { port, calls } = recorder('deleteToken');
    await unpairPush(port);
    expect(calls).toEqual(['unregister:fcm-token-1', 'deleteKeys']);
  });

  test('a stored token that cannot be read still deletes the keys', async () => {
    const { port, calls } = recorder('storedToken');
    await unpairPush(port);
    expect(calls).toEqual(['deleteToken', 'deleteKeys']);
  });
});
