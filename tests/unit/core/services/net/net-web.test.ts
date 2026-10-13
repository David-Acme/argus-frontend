import { afterAll, beforeEach, describe, expect, mock, setSystemTime, test } from 'bun:test';
import { mayRediscover, REDISCOVERY_MEMO_MS } from '@/core/services/net/net-routes';
import type { NetDiscovery, NetRoutePorts } from '@/core/types';

const OLD_IP = '192.168.18.205';
const NEW_IP = '192.168.50.9';

const store = new Map<string, string>();
let discovery: NetDiscovery | null = null;
let discoveryFails = false;
let holdDiscovery = false;
let releaseDiscovery: (() => void) | null = null;
let relocateFails = false;
let discoveryCalls = 0;
const relocateCalls: { url: string; ip: string }[] = [];
const socketChannels: { onmessage: ((payload: ArrayBuffer) => void) | null }[] = [];
const probedUrls: string[] = [];
const openedUrls: string[] = [];
let answers: (url: string) => boolean = () => false;
let socketAnswers: (url: string) => boolean = () => true;

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

mock.module('@tauri-apps/api/core', () => ({
  Channel: class {
    onmessage: ((payload: ArrayBuffer) => void) | null = null;
  },
  invoke: async (command: string, args?: Record<string, unknown>) => {
    if (command === 'argus_discover') {
      discoveryCalls += 1;
      if (holdDiscovery) await new Promise<void>((resolve) => { releaseDiscovery = resolve; });
      if (discoveryFails) throw 'DISCOVERY_NOT_FOUND';
      return discovery;
    }
    if (command === 'argus_relocate') {
      relocateCalls.push({ url: String(args?.url), ip: String(args?.ip) });
      if (relocateFails) throw 'CERT_NOT_TRUSTED|The candidate did not answer under the paired CA';
      return undefined;
    }
    if (command === 'argus_socket_open') {
      const url = String((args?.options as { url?: string } | undefined)?.url);
      openedUrls.push(url);
      if (!socketAnswers(url)) throw 'NETWORK_ERROR|The socket could not connect';
      socketChannels.push(args?.onEvent as (typeof socketChannels)[number]);
      return undefined;
    }
    if (command === 'argus_request') {
      const url = String((args?.request as { url?: string } | undefined)?.url);
      probedUrls.push(url);
      if (!answers(url)) throw 'NETWORK_ERROR|The home did not answer';
      return { status: 200, headers: {}, body: '' };
    }
    throw `UNEXPECTED_COMMAND|${command}`;
  },
}));

const { netService } = await import('@/core/services/net/net.web');

const REMOTE = { homeId: '0123456789abcdef0123456789abcdef', domain: 'argus-tunnel.lynk.page' };
const throughRelay = (url: string): boolean => url.includes(`--${REMOTE.homeId}.${REMOTE.domain}/`);
const { clearInstance, savePairingMetadata } = await import('@/core/services/net/net-persistence');

const pairing = {
  caPem: 'pem',
  caFingerprint: 'fingerprint',
  serverFingerprint: 'fingerprint',
  instanceId: 'instance',
  port: 7044,
  scheme: 'https',
};

const seed = async (routes: NetRoutePorts): Promise<void> => {
  store.set('net.caPem', pairing.caPem);
  store.set('net.host', 'argus.local');
  store.set('net.ip', OLD_IP);
  await savePairingMetadata({ pairing, host: 'argus.local', ip: OLD_IP, routes });
};

const announcement = (ip: string, routes: { path: string; port: number }[]): NetDiscovery => ({
  host: 'argus.local',
  ip,
  port: 7044,
  https: true,
  routes: routes.map((route) => ({ ...route, https: true })),
});

const until = async (ready: () => boolean): Promise<void> => {
  for (let tick = 0; tick < 200 && !ready(); tick += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

let clock = Date.UTC(2026, 9, 12, 12, 0, 0);

describe('the desktop net service against a moved server', () => {
  beforeEach(async () => {
    clock += REDISCOVERY_MEMO_MS;
    setSystemTime(new Date(clock));
    await clearInstance();
    store.clear();
    discovery = null;
    discoveryFails = false;
    holdDiscovery = false;
    releaseDiscovery = null;
    relocateFails = false;
    discoveryCalls = 0;
    relocateCalls.length = 0;
    probedUrls.length = 0;
    openedUrls.length = 0;
    answers = () => false;
    socketAnswers = () => true;
  });

  test('a failed connect away from home moves the route to the relay', async () => {
    await seed({ auth: 7024 });
    await netService.rememberRemote(REMOTE);
    discoveryFails = true;
    answers = throughRelay;

    expect(await netService.refreshAddress()).toBe(true);
    expect(probedUrls.sort()).toEqual(
      ['https://argus.local:7044/pairing/status', `https://identity--${REMOTE.homeId}.${REMOTE.domain}/pairing/status`].sort()
    );
    expect((await netService.instance())?.route).toBe('relay');
  });

  test('on the relay, a candidate address is still checked on the LAN', async () => {
    await seed({ auth: 7024 });
    await netService.rememberRemote(REMOTE);
    answers = throughRelay;
    expect(await netService.probeRoute()).toEqual({ mode: 'relay', status: 'cloud' });
    discovery = announcement(NEW_IP, [{ path: '/pairing', port: 7044 }]);

    expect(await netService.refreshAddress()).toBe(true);
    expect(relocateCalls).toEqual([{ url: 'https://argus.local:7044/pairing/status', ip: NEW_IP }]);
    expect((await netService.instance())?.route).toBe('lan');
  });

  test('a socket that could not connect reopens at the device name once the route moved', async () => {
    await seed({ auth: 7024 });
    await netService.rememberRemote(REMOTE);
    discoveryFails = true;
    answers = throughRelay;
    socketAnswers = throughRelay;

    await netService.openSocket({ url: 'wss://argus.local:7025/sync', headers: {} });

    expect(openedUrls).toEqual([
      'wss://argus.local:7025/sync',
      `wss://sync--${REMOTE.homeId}.${REMOTE.domain}/sync`,
    ]);
  });

  afterAll(() => {
    setSystemTime();
  });

  test('a server that moved is relocated from the discovery and its routes are stored', async () => {
    await seed({ auth: 7024 });
    discovery = announcement(NEW_IP, [
      { path: '/auth', port: 7042 },
      { path: '/pairing', port: 7044 },
    ]);

    expect(await netService.refreshAddress()).toBe(true);
    expect(relocateCalls).toEqual([{ url: 'https://argus.local:7044/pairing/status', ip: NEW_IP }]);
    expect(JSON.parse(store.get('net.routes') ?? '')).toEqual({ auth: 7042, pairing: 7044 });
    expect(store.get('net.ip')).toBe(OLD_IP);
  });

  test('a candidate the paired CA refuses leaves the stored address untouched', async () => {
    await seed({ auth: 7024 });
    discovery = announcement(NEW_IP, [{ path: '/auth', port: 7042 }]);
    relocateFails = true;

    expect(await netService.refreshAddress()).toBe(false);
    expect(relocateCalls).toHaveLength(1);
    expect(store.get('net.routes')).toBe(JSON.stringify({ auth: 7024 }));
  });

  test('a rediscovery already in flight is not started twice', async () => {
    await seed({ auth: 7024 });
    discovery = announcement(NEW_IP, [{ path: '/auth', port: 7042 }]);
    holdDiscovery = true;

    const first = netService.refreshAddress();
    const second = netService.refreshAddress();
    await until(() => releaseDiscovery !== null);
    releaseDiscovery?.();
    const results = await Promise.all([first, second]);

    expect(results).toEqual([true, true]);
    expect(discoveryCalls).toBe(1);
  });

  test('a rediscovery that found nothing is not repeated inside the window', async () => {
    await seed({ auth: 7024 });
    discovery = announcement(OLD_IP, [{ path: '/auth', port: 7024 }]);

    expect(await netService.refreshAddress()).toBe(false);
    expect(discoveryCalls).toBe(1);
    expect(mayRediscover(clock, Date.now())).toBe(false);
    expect(await netService.refreshAddress()).toBe(false);
    expect(discoveryCalls).toBe(1);
  });

  test('a discovery that failed is memoized the same way', async () => {
    await seed({ auth: 7024 });
    discoveryFails = true;

    expect(await netService.refreshAddress()).toBe(false);
    expect(discoveryCalls).toBe(1);
    expect(await netService.refreshAddress()).toBe(false);
    expect(discoveryCalls).toBe(1);
  });

  test('the close frame the desktop host sends for a silent peer is an ordinary socket close', async () => {
    await seed({ auth: 7024 });
    const socket = await netService.openSocket({
      url: 'wss://argus.local:7025/sync',
      headers: {},
    });
    const reason = 'Peer stopped answering';
    const encoded = new TextEncoder().encode(reason);
    const frame = new Uint8Array(5 + encoded.length);
    frame[0] = 4;
    new DataView(frame.buffer).setUint32(1, 1006);
    frame.set(encoded, 5);

    let code = 0;
    let closed = '';
    socket.onClose = (value, text) => {
      code = value;
      closed = text ?? '';
    };
    socketChannels.at(-1)?.onmessage?.(frame.buffer as ArrayBuffer);

    expect(code).toBe(1006);
    expect(closed).toBe(reason);
  });
});
