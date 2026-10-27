import { afterEach, describe, expect, mock, test } from 'bun:test';
import type { IArgusSocket } from '@/core/interfaces';
import type { NetPairedInstance } from '@/core/types';
import { WS_RECONNECT_BASE_MS } from '@/shared/constants';

const paired: NetPairedInstance = {
  host: 'argus.local',
  ip: '192.168.1.20',
  port: 7044,
  caPem: 'pem',
  caFingerprint: 'fingerprint',
  instanceId: 'instance',
  pairedAt: 1,
  routes: { sync: 7025 },
};

type Scheduled = { run: () => void; ms: number };

let instance: NetPairedInstance | null = paired;
let token: string | null = null;
let refreshes = 0;
const opened: string[] = [];
const scheduled: Scheduled[] = [];
const realSetTimeout = globalThis.setTimeout;

const fakeSocket = (): IArgusSocket => ({
  onOpen: null,
  onMessage: null,
  onError: null,
  onClose: null,
  sendText: () => undefined,
  sendBinary: () => undefined,
  close: () => undefined,
});

mock.module('@/core/services/net', () => ({
  netService: {
    instance: async () => instance,
    refreshAddress: async () => {
      refreshes += 1;
      return false;
    },
  },
}));

const { SyncConnection } = await import('@/core/services/sync/sync-connection');

const hooks = {
  openSocket: async ({ url }: { url: string }) => {
    opened.push(url);
    return fakeSocket();
  },
  accessToken: () => token,
  isClearing: () => false,
  onAttach: () => undefined,
  onLost: () => undefined,
  onText: () => undefined,
  onBinary: () => undefined,
  refreshSession: () => undefined,
  clearSession: () => undefined,
};

const live: InstanceType<typeof SyncConnection>[] = [];

const capture = (run: () => void, ms?: number) => {
  if (ms !== undefined && ms >= WS_RECONNECT_BASE_MS / 2) {
    scheduled.push({ run, ms });
    return realSetTimeout(() => undefined, 0);
  }
  return realSetTimeout(run, ms);
};

const settle = () => new Promise((resolve) => realSetTimeout(resolve, 0));

describe('the sync socket comes back when its credentials arrive late', () => {
  afterEach(() => {
    live.splice(0).forEach((connection) => connection.halt());
    globalThis.setTimeout = realSetTimeout;
    scheduled.length = 0;
    opened.length = 0;
    refreshes = 0;
    instance = paired;
    token = null;
  });

  test('a missing access token schedules a quick retry, and the token that arrives opens the socket', async () => {
    globalThis.setTimeout = capture as typeof setTimeout;
    const connection = new SyncConnection(hooks);
    live.push(connection);
    expect(await connection.connect()).toBe(false);
    expect(opened).toEqual([]);
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]?.ms).toBeLessThanOrEqual(WS_RECONNECT_BASE_MS);
    expect(refreshes).toBe(0);
    token = 'token';
    scheduled[0]?.run();
    await settle();
    await settle();
    expect(opened).toEqual(['wss://argus.local:7025/sync']);
  });

  test('a home not paired yet is tried again too', async () => {
    globalThis.setTimeout = capture as typeof setTimeout;
    instance = null;
    token = 'token';
    const connection = new SyncConnection(hooks);
    live.push(connection);
    expect(await connection.connect()).toBe(false);
    expect(scheduled).toHaveLength(1);
    instance = paired;
    scheduled[0]?.run();
    await settle();
    await settle();
    expect(opened).toEqual(['wss://argus.local:7025/sync']);
  });

  test('a halted connection schedules nothing', async () => {
    globalThis.setTimeout = capture as typeof setTimeout;
    const connection = new SyncConnection(hooks);
    live.push(connection);
    const attempt = connection.connect();
    connection.halt();
    await attempt;
    expect(scheduled).toEqual([]);
  });
});
