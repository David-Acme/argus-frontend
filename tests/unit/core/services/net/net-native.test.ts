import { afterAll, beforeEach, describe, expect, mock, setSystemTime, test } from 'bun:test';
import { REDISCOVERY_MEMO_MS, serviceUrl } from '@/core/services/net/net-routes';
import type { NetDiscovery } from '@/core/types';

const OLD_IP = '192.168.18.205';
const NEW_IP = '192.168.50.9';
const STATUS_URL = 'https://argus.local:7042/auth/status';

const store = new Map<string, string>();
let configuredIp: string | null = null;
let configuredRemote: string[] | null = null;
let requestUrls: string[] = [];
let failure = 'NETWORK_ERROR|Failed to connect to /192.168.18.205:7042';
let discovery: NetDiscovery | null = null;
let discoveryCalls = 0;
let calls: string[] = [];
let answers: ((url: string) => boolean) | null = null;
let probeOutcome: ((url: string) => string) | null = null;
let probeHeaders: Record<string, string>[] = [];
let warnings: string[] = [];
let errors: string[] = [];

mock.module('@/core/services/log', () => ({
  log: {
    error: (_scope: string, message: string) => errors.push(message),
    warn: (_scope: string, message: string) => warnings.push(message),
    debug: () => undefined,
  },
}));

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

mock.module('@/core/services/instance-storage', () => ({
  instanceStorageService: {
    getStringAsync: async (key: string) => store.get(key) ?? null,
    setStringAsync: async (key: string, value: string) => {
      store.set(key, value);
    },
    deleteAsync: async (key: string) => {
      store.delete(key);
    },
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
      calls.push(`configure|${ip}`);
    },
    configureRemote: (homeId: string, domain: string) => {
      configuredRemote = [homeId, domain];
      calls.push(`configureRemote|${homeId}|${domain}`);
    },
    pair: async () => {
      throw 'UNEXPECTED_CALL|pair';
    },
    request: async ({ url }: { url: string }) => {
      requestUrls.push(url);
      calls.push(`request|${url}`);
      if (answers ? !answers(url) : configuredIp === OLD_IP) throw failure;
      return { status: 200, headers: {}, body: JSON.stringify({ status: 200, info: { id: 1 }, errors: null }) };
    },
    probe: async ({ url, headers }: { url: string; headers: Record<string, string> }) => {
      calls.push(`probe|${url}`);
      probeHeaders.push(headers);
      const reached = answers ? answers(url) : configuredIp !== OLD_IP;
      const outcome = probeOutcome ? probeOutcome(url) : reached ? 'reached' : 'connect';
      return { outcome, address: `${configuredIp}:7044`, fingerprint: outcome === 'pin' ? 'AB12' : '' };
    },
    openSocket: async () => {
      throw 'UNEXPECTED_CALL|openSocket';
    },
  }),
}));

const { netService } = await import('@/core/services/net/net.native');
const { clearInstance, savePairing, savePairingMetadata, storedInstance } = await import(
  '@/core/services/net/net-persistence'
);

const REMOTE = { homeId: '0123456789abcdef0123456789abcdef', domain: 'argus-tunnel.lynk.page' };
const RELAY_STATUS_URL = `https://identity--${REMOTE.homeId}.${REMOTE.domain}/pairing/status`;
const LAN_STATUS_URL = 'https://argus.local:7044/pairing/status';
const throughRelay = (url: string): boolean => url.includes(`--${REMOTE.homeId}.${REMOTE.domain}/`);

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
    await netService.unpair();
    await clearInstance();
    store.clear();
    requestUrls = [];
    discovery = null;
    discoveryCalls = 0;
    configuredRemote = null;
    calls = [];
    answers = null;
    probeOutcome = null;
    probeHeaders = [];
    warnings = [];
    errors = [];
    failure = 'NETWORK_ERROR|Failed to connect to /192.168.18.205:7042';
    await seed();
  });

  test('a new home id reaches the native module before the next request goes out', async () => {
    answers = () => true;
    await netService.unpair();
    await seed();
    await netService.rememberRemote(REMOTE);
    await request();
    const moved = { homeId: 'fedcba9876543210fedcba9876543210', domain: REMOTE.domain };
    calls = [];

    expect(await netService.rememberRemote(moved)).toBe(true);
    await request();

    const configured = calls.indexOf(`configureRemote|${moved.homeId}|${moved.domain}`);
    const sent = calls.findIndex((call) => call.startsWith('request|'));
    expect(configured).toBeGreaterThanOrEqual(0);
    expect(configured).toBeLessThan(sent);
    expect(configuredRemote).toEqual([moved.homeId, moved.domain]);
  });

  test('a probe away from home picks the relay, and the native module knows the profile before it dials it', async () => {
    await netService.unpair();
    await seed();
    await netService.rememberRemote(REMOTE);
    answers = throughRelay;
    calls = [];

    expect(await netService.probeRoute()).toEqual({ mode: 'relay', status: 'cloud', relayRefused: false });

    const configured = calls.indexOf(`configureRemote|${REMOTE.homeId}|${REMOTE.domain}`);
    expect(configured).toBeGreaterThanOrEqual(0);
    expect(configured).toBeLessThan(calls.indexOf(`probe|${RELAY_STATUS_URL}`));
    expect(calls).toContain(`probe|${LAN_STATUS_URL}`);
    const instance = await netService.instance();
    expect(instance?.route).toBe('relay');
    expect(instance && serviceUrl(instance, '/auth/status')).toBe(
      `https://auth--${REMOTE.homeId}.${REMOTE.domain}/auth/status`
    );
  });

  test('a probe at home keeps the LAN, and nothing crosses the cloud', async () => {
    await netService.rememberRemote(REMOTE);
    answers = () => true;
    calls = [];

    expect(await netService.probeRoute()).toEqual({ mode: 'lan', status: 'home', relayRefused: false });
    expect((await netService.instance())?.route).toBe('lan');
    expect(calls.filter((call) => call.startsWith('probe|'))).toEqual([`probe|${LAN_STATUS_URL}`]);
  });

  test('a failed connect away from home moves the route to the relay once', async () => {
    await netService.rememberRemote(REMOTE);
    answers = throughRelay;

    expect(await netService.refreshAddress()).toBe(true);
    expect((await netService.instance())?.route).toBe('relay');
    expect(await netService.refreshAddress()).toBe(false);
    expect((await netService.instance())?.route).toBe('relay');
  });

  test('a home found again on the LAN wins over the relay, and its address is checked on the LAN', async () => {
    await netService.rememberRemote(REMOTE);
    answers = throughRelay;
    expect(await netService.probeRoute()).toEqual({ mode: 'relay', status: 'cloud', relayRefused: false });
    answers = (url) => throughRelay(url) || configuredIp === NEW_IP;
    discovery = announcement(NEW_IP);
    calls = [];

    expect(await netService.refreshAddress()).toBe(true);

    expect(calls).toContain(`request|${LAN_STATUS_URL}`);
    expect(calls.some((call) => throughRelay(call.slice(call.indexOf('|') + 1)))).toBe(false);
    const instance = await netService.instance();
    expect(instance?.route).toBe('lan');
    expect(instance?.ip).toBe(NEW_IP);
  });

  test('the route choice reaches its listeners once per change and is forgotten on unpair', async () => {
    await netService.unpair();
    await seed();
    await netService.rememberRemote(REMOTE);
    const seen: (string | null)[] = [];
    const stop = netService.onRouteChoice(() => seen.push(netService.routeChoice()?.status ?? null));

    answers = throughRelay;
    await netService.probeRoute();
    await netService.probeRoute();
    answers = () => true;
    await netService.probeRoute();
    await netService.unpair();
    stop();
    await netService.probeRoute();

    expect(seen).toEqual(['cloud', 'home', null]);
    expect(netService.routeChoice()).toBeNull();
  });

  test('a probe sends the device identity and never a credential', async () => {
    await netService.rememberRemote(REMOTE);
    answers = throughRelay;
    await netService.probeRoute();

    expect(probeHeaders.length).toBe(2);
    for (const headers of probeHeaders) {
      const names = Object.keys(headers).map((name) => name.toLowerCase());
      expect(names).toContain('x-argus-client');
      expect(names.filter((name) => ['authorization', 'cookie', 'x-argus-device-credential'].includes(name))).toEqual([]);
    }
  });

  test('a LAN that fails the pin is set aside for the relay until it answers under the pin, and is logged once', async () => {
    await netService.rememberRemote(REMOTE);
    probeOutcome = (url) => (throughRelay(url) ? 'connect' : 'pin');

    expect(await netService.probeRoute()).toEqual({ mode: 'relay', status: 'remote-unavailable', relayRefused: false });
    probeOutcome = (url) => (throughRelay(url) ? 'connect' : 'connect');
    expect(await netService.probeRoute()).toEqual({ mode: 'relay', status: 'remote-unavailable', relayRefused: false });
    probeOutcome = (url) => (throughRelay(url) ? 'connect' : 'pin');
    await netService.probeRoute();
    expect((await netService.instance())?.route).toBe('relay');
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain(`${OLD_IP}:7044`);
    expect(warnings[0]).toContain('AB12');

    probeOutcome = () => 'reached';
    expect(await netService.probeRoute()).toEqual({ mode: 'lan', status: 'home', relayRefused: false });
    expect((await netService.instance())?.route).toBe('lan');
  });

  test('a LAN that fails the pin with no profile leaves no route, and remote access is unavailable', async () => {
    await netService.unpair();
    await seed();
    probeOutcome = () => 'pin';

    expect(await netService.probeRoute()).toEqual({ mode: null, status: 'remote-unavailable', relayRefused: false });
    expect((await netService.instance())?.route).toBeUndefined();
    expect(calls.filter((call) => call.startsWith('probe|'))).toEqual([`probe|${LAN_STATUS_URL}`]);
  });

  test('a relay that fails the pin raises the refusal, logged once, and shows no calm state', async () => {
    await netService.rememberRemote(REMOTE);
    probeOutcome = (url) => (throughRelay(url) ? 'pin' : 'connect');

    expect(await netService.probeRoute()).toEqual({ mode: 'lan', status: null, relayRefused: true });
    await netService.probeRoute();
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('AB12');
    expect(netService.routeChoice()?.relayRefused).toBe(true);
  });

  test('the instance waits for a probe in flight', async () => {
    await netService.rememberRemote(REMOTE);
    answers = throughRelay;

    const probe = netService.probeRoute();
    const instance = await netService.instance();

    expect(instance?.route).toBe('relay');
    expect(await probe).toEqual({ mode: 'relay', status: 'cloud', relayRefused: false });
  });

  test('the native transport is told there is no remote profile while the instance carries none', async () => {
    await netService.unpair();
    await seed();
    discovery = announcement(NEW_IP);

    await request();

    expect(configuredRemote).toEqual(['', '']);
  });

  afterAll(() => {
    setSystemTime();
  });

  test('a home id the context brings is kept once, and the next request hands it to the native module', async () => {
    await netService.unpair();
    await seed();
    discovery = announcement(NEW_IP);

    expect(await netService.rememberRemote(REMOTE)).toBe(true);
    expect(await netService.rememberRemote(REMOTE)).toBe(false);
    expect(store.get('net.remoteHomeId')).toBe(REMOTE.homeId);
    expect(store.get('net.remoteDomain')).toBe(REMOTE.domain);
    expect((await netService.instance())?.remote).toEqual(REMOTE);

    await request();

    expect(configuredRemote).toEqual([REMOTE.homeId, REMOTE.domain]);
  });

  test('an unusable profile is not kept, and neither is one for an app that is not paired', async () => {
    expect(await netService.rememberRemote({ ...REMOTE, homeId: REMOTE.homeId.toUpperCase() })).toBe(false);
    expect(store.has('net.remoteHomeId')).toBe(false);
    await netService.unpair();
    expect(await netService.rememberRemote(REMOTE)).toBe(false);
    expect(store.has('net.remoteHomeId')).toBe(false);
  });

  test('a new pairing and an unpairing both forget the remote profile', async () => {
    await netService.rememberRemote(REMOTE);
    await seed();
    expect(store.has('net.remoteHomeId')).toBe(false);
    expect(store.has('net.remoteDomain')).toBe(false);
    expect((await netService.instance())?.remote).toBeUndefined();

    await netService.rememberRemote(REMOTE);
    await netService.unpair();
    expect(store.has('net.remoteHomeId')).toBe(false);
    expect(store.has('net.remoteDomain')).toBe(false);
  });

  test('a refused connection rediscovers once and the request is retried at the announced address', async () => {
    discovery = announcement(NEW_IP);

    const result = await request();

    expect(result.status).toBe(200);
    expect(discoveryCalls).toBe(1);
    expect(requestUrls.filter((url) => url === STATUS_URL)).toEqual([STATUS_URL, STATUS_URL]);
    expect(configuredIp).toBe(NEW_IP);
    expect(store.get('net.ip')).toBe(NEW_IP);
  });

  test('a read timeout is reported without redialling the address', async () => {
    discovery = announcement(NEW_IP);
    failure = 'TIMEOUT|Read timed out';

    await expect(request()).rejects.toMatchObject({ code: 'TIMEOUT' });

    expect(discoveryCalls).toBe(0);
    expect(requestUrls).toEqual([STATUS_URL]);
    expect(configuredIp).toBe(OLD_IP);
    expect(store.get('net.ip')).toBe(OLD_IP);
  });

  test('a certificate refusal is reported without adopting another address', async () => {
    discovery = announcement(NEW_IP);
    failure = 'CERT_NOT_TRUSTED|bad certificate';

    await expect(request()).rejects.toMatchObject({ code: 'CERT_NOT_TRUSTED' });

    expect(discoveryCalls).toBe(0);
    expect(requestUrls).toEqual([STATUS_URL]);
    expect(store.get('net.ip')).toBe(OLD_IP);
  });

  test('a rediscovery that found nothing is not repeated inside the window', async () => {
    discovery = announcement(OLD_IP);

    await expect(request()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(discoveryCalls).toBe(1);

    await expect(request()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(discoveryCalls).toBe(1);
  });
});

describe('the paired instance read when the app starts', () => {
  const stored = {
    'net.caPem': 'pem',
    'net.host': 'argus.local',
    'net.ip': OLD_IP,
    'net.port': '7044',
    'net.remoteHomeId': REMOTE.homeId,
    'net.remoteDomain': REMOTE.domain,
  };

  test('carries the remote profile that was kept', () => {
    expect(storedInstance(stored)?.remote).toEqual(REMOTE);
  });

  test('leaves out a profile that is not usable or not whole', () => {
    expect(storedInstance({ ...stored, 'net.remoteHomeId': REMOTE.homeId.toUpperCase() })?.remote).toBeUndefined();
    expect(storedInstance({ ...stored, 'net.remoteDomain': null })?.remote).toBeUndefined();
    expect(storedInstance({ ...stored, 'net.remoteHomeId': null })?.remote).toBeUndefined();
    expect(storedInstance({ ...stored, 'net.remoteDomain': 'localhost' })?.remote).toBeUndefined();
  });

  test('is nothing without the pinned server', () => {
    expect(storedInstance({ ...stored, 'net.caPem': null })).toBeNull();
    expect(storedInstance({ ...stored, 'net.ip': '' })).toBeNull();
  });
});
