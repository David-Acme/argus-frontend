import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { NetPairing } from '@/core/types';
import { NET_STORAGE_KEYS, NET_TRUST_KEYS } from '@/shared/constants/net.constant';

const instanceStore = new Map<string, string>();
const secureStore = new Map<string, string>();
const instanceDeletes: string[] = [];
const secureDeletes: string[] = [];

mock.module('@/core/services/instance-storage', () => ({
  instanceStorageService: {
    getStringAsync: async (key: string) => instanceStore.get(key) ?? null,
    setStringAsync: async (key: string, value: string) => {
      instanceStore.set(key, value);
    },
    deleteAsync: async (key: string) => {
      instanceDeletes.push(key);
      instanceStore.delete(key);
    },
  },
}));

mock.module('@/core/services/secure-storage', () => ({
  secureStorageService: {
    getStringAsync: async (key: string) => secureStore.get(key) ?? null,
    setStringAsync: async (key: string, value: string) => {
      secureStore.set(key, value);
    },
    deleteAsync: async (key: string) => {
      secureDeletes.push(key);
      secureStore.delete(key);
    },
    hasAsync: async (key: string) => secureStore.has(key),
  },
}));

const { SESSION_STORAGE_KEYS, clearInstance, isPaired, savePairingMetadata } = await import(
  '@/core/services/net/net-persistence'
);

const pairing: NetPairing = {
  caPem: 'ca',
  caFingerprint: 'fingerprint',
  serverFingerprint: 'fingerprint',
  instanceId: 'instance',
  port: 7044,
  scheme: 'https',
};

const seedPairing = async (): Promise<void> => {
  await savePairingMetadata({ pairing, host: 'argus.local', ip: '192.168.1.10', routes: { pairing: 7044 } });
  instanceDeletes.length = 0;
  secureDeletes.length = 0;
};

beforeEach(() => {
  instanceStore.clear();
  secureStore.clear();
  instanceDeletes.length = 0;
  secureDeletes.length = 0;
});

describe('the pairing lives in the store that survives a restore, the session does not', () => {
  test('only the session secrets are kept in the secure store', () => {
    expect([...SESSION_STORAGE_KEYS].sort()).toEqual(
      [NET_STORAGE_KEYS.accessToken, NET_STORAGE_KEYS.refreshToken, NET_STORAGE_KEYS.deviceCredential].sort(),
    );
  });

  test('every other key of the net namespace is instance material', () => {
    const instanceKeys = Object.values(NET_STORAGE_KEYS).filter((key) => !SESSION_STORAGE_KEYS.includes(key));
    expect([...instanceKeys, ...SESSION_STORAGE_KEYS].sort()).toEqual(Object.values(NET_STORAGE_KEYS).sort());
    expect(instanceKeys).toContain(NET_STORAGE_KEYS.paired);
    expect(instanceKeys).toContain(NET_STORAGE_KEYS.caPem);
    expect(instanceKeys).toContain(NET_STORAGE_KEYS.caFingerprint);
  });

  test('a saved pairing never touches the secure store', async () => {
    await seedPairing();
    expect(secureStore.size).toBe(0);
    expect(secureDeletes).toEqual([]);
    expect(instanceStore.get(NET_STORAGE_KEYS.paired)).toBe('true');
    expect(await isPaired()).toBe(true);
  });

  test('clearing the instance empties both stores', async () => {
    await seedPairing();
    secureStore.set(NET_STORAGE_KEYS.accessToken, 'access');
    secureStore.set(NET_STORAGE_KEYS.refreshToken, 'refresh');
    secureStore.set(NET_STORAGE_KEYS.deviceCredential, 'credential');

    await clearInstance();

    expect([...instanceDeletes].sort()).toEqual(
      Object.values(NET_STORAGE_KEYS)
        .filter((key) => !SESSION_STORAGE_KEYS.includes(key))
        .sort(),
    );
    expect([...secureDeletes].sort()).toEqual([...SESSION_STORAGE_KEYS].sort());
  });

  test('clearing with the trust keys kept leaves them in the instance store', async () => {
    await seedPairing();
    secureStore.set(NET_STORAGE_KEYS.accessToken, 'access');

    await clearInstance(NET_TRUST_KEYS);

    for (const key of NET_TRUST_KEYS) expect(instanceDeletes).not.toContain(key);
    expect(instanceDeletes).toContain(NET_STORAGE_KEYS.paired);
    expect([...secureDeletes].sort()).toEqual([...SESSION_STORAGE_KEYS].sort());
  });
});
