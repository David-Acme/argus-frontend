import { afterAll, beforeEach, describe, expect, mock, setSystemTime, test } from 'bun:test';
import { REDISCOVERY_MEMO_MS } from '@/core/services/net/net-routes';
import type { NetDiscovery } from '@/core/types';

const OLD_IP = '192.168.18.205';
const NEW_IP = '192.168.50.9';
const STATUS_URL = 'https://argus.local:7042/auth/status';

const store = new Map<string, string>();
let configuredIp: string | null = null;
let requestUrls: string[] = [];
let failKind: 'timeout' | 'certificate' = 'timeout';
let discovery: NetDiscovery | null = null;
let discoveryCalls = 0;

mock.module('@/core/services/secure-storage', () => ({
  secureStorageService: {
    getStringAsync: async (key: string) => store.get(key) ?? null,
    setStringAsync: async (key: string, value: string) => {
      store.set(key, value);
    },
    deleteAsync: async (key: string) => {
      store.delete(key);
    },
    hasAsync: async (key: string) => store.has(key),
  },
}));

mock.module('expo-constants', () => ({
  default: { expoConfig: { version: '1.2.3' }, deviceName: 'laptop' },
}));

mock.module('argus-net', () => ({
  createArgusNet: () => ({
    discover: async () => {
      discoveryCalls += 1;
      if (!discovery) throw 'DISCOVERY_NOT_FOUND';
      return discovery;
    },
    configure: (_caPem: string, _host: string, ip: string) => {
      configuredIp = ip;
    },
    pair: async () => {
      throw 'UNEXPECTED_CALL|pair';
    },
    request: async ({ url }: { url: string }) => {
      requestUrls.push(url);
      if (configuredIp === OLD_IP) {
        throw failKind === 'certificate' ? 'CERT_NOT_TRUSTED|bad certificate' : 'TIMEOUT|connect timed out';
      }
      return { status: 200, headers: {}, body: JSON.stringify({ status: 200, info: { id: 1 }, errors: null }) };
    },
    openSocket: async () => {
      throw 'UNEXPECTED_CALL|openSocket';
    },
  }),
}));

const { netService } = await import('@/core/services/net/net.native');
const { clearInstance, savePairing, savePairingMetadata } = await import('@/core/services/net/net-persistence');

const pairing = {
  caPem: 'pem',
  caFingerprint: 'fingerprint',
  serverFingerprint: 'fingerprint',
  instanceId: 'instance',
  port: 7044,
  scheme: 'https',
};

const seed = async (): Promise<void> => {
  await savePairing({
    pairing,
    host: 'argus.local',
    ip: OLD_IP,
    routes: { auth: 7042, pairing: 7044 },
  });
  await savePairingMetadata({
    pairing,
    host: 'argus.local',
    ip: OLD_IP,
    routes: { auth: 7042, pairing: 7044 },
  });
  configuredIp = OLD_IP;
};

const announcement = (ip: string): NetDiscovery => ({
  host: 'argus.local',
  ip,
  port: 7044,
  https: true,
  routes: [
    { path: '/auth', port: 7042, https: true },
    { path: '/pairing', port: 7044, https: true },
  ],
});

const request = () =>
  netService.request({ url: STATUS_URL, method: 'GET', headers: {}, body: '', files: [] });

let clock = Date.UTC(2026, 9, 12, 12, 0, 0);

describe('the phone net service against a moved server', () => {
  beforeEach(async () => {
    clock += REDISCOVERY_MEMO_MS;
    setSystemTime(new Date(clock));
    await clearInstance();
    store.clear();
    requestUrls = [];
    discovery = null;
    discoveryCalls = 0;
    failKind = 'timeout';
    await seed();
  });

  afterAll(() => {
    setSystemTime();
  });

  test('a request that timed out rediscovers once and is retried at the announced address', async () => {
    discovery = announcement(NEW_IP);

    const result = await request();

    expect(result.status).toBe(200);
    expect(discoveryCalls).toBe(1);
    expect(requestUrls.filter((url) => url === STATUS_URL)).toEqual([STATUS_URL, STATUS_URL]);
    expect(configuredIp).toBe(NEW_IP);
    expect(store.get('net.ip')).toBe(NEW_IP);
  });

  test('a certificate refusal is reported without adopting another address', async () => {
    discovery = announcement(NEW_IP);
    failKind = 'certificate';

    await expect(request()).rejects.toMatchObject({ code: 'CERT_NOT_TRUSTED' });

    expect(discoveryCalls).toBe(0);
    expect(requestUrls).toEqual([STATUS_URL]);
    expect(store.get('net.ip')).toBe(OLD_IP);
  });

  test('a rediscovery that found nothing is not repeated inside the window', async () => {
    discovery = announcement(OLD_IP);

    await expect(request()).rejects.toMatchObject({ code: 'TIMEOUT' });
    expect(discoveryCalls).toBe(1);

    await expect(request()).rejects.toMatchObject({ code: 'TIMEOUT' });
    expect(discoveryCalls).toBe(1);
  });
});
