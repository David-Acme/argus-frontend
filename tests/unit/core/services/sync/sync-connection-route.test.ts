import { afterEach, describe, expect, mock, test } from 'bun:test';
import type { IArgusSocket } from '@/core/interfaces';
import type { NetPairedInstance, NetRouteMode } from '@/core/types';

const base: NetPairedInstance = {
  host: 'argus.local',
  ip: '192.168.1.20',
  port: 7044,
  caPem: 'pem',
  caFingerprint: 'fingerprint',
  instanceId: 'instance',
  pairedAt: 1,
  routes: { sync: 7025 },
  remote: { homeId: '0123456789abcdef0123456789abcdef', domain: 'argus-tunnel.lynk.page' },
};

let instance: NetPairedInstance = base;
const opened: string[] = [];
const closed: string[] = [];
let lastSocket: IArgusSocket | null = null;
const current = (): IArgusSocket | null => lastSocket;

const fakeSocket = (): IArgusSocket => ({
  onOpen: null,
  onMessage: null,
  onError: null,
  onClose: null,
  sendText: () => undefined,
  sendBinary: () => undefined,
  close: (_code?: number, reason?: string) => {
    closed.push(reason ?? '');
  },
});

mock.module('@/core/services/net', () => ({
  netService: {
    instance: async () => instance,
    refreshAddress: async () => false,
  },
}));

const { SyncConnection } = await import('@/core/services/sync/sync-connection');

const hooks = {
  openSocket: async ({ url }: { url: string }) => {
    opened.push(url);
    lastSocket = fakeSocket();
    return lastSocket;
  },
  accessToken: () => 'token',
  isClearing: () => false,
  onAttach: () => undefined,
  onLost: () => undefined,
  onText: () => undefined,
  onBinary: () => undefined,
  refreshSession: () => undefined,
  clearSession: () => undefined,
};

const until = async (ready: () => boolean): Promise<void> => {
  for (let tick = 0; tick < 200 && !ready(); tick += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

const live: InstanceType<typeof SyncConnection>[] = [];

async function connectedOn(route: NetRouteMode | undefined): Promise<InstanceType<typeof SyncConnection>> {
  instance = route ? { ...base, route } : base;
  lastSocket = null;
  const connection = new SyncConnection(hooks);
  live.push(connection);
  const attempt = connection.connect();
  await until(() => current()?.onOpen != null);
  current()?.onOpen?.();
  expect(await attempt).toBe(true);
  return connection;
}

describe('the sync socket follows the route to the home', () => {
  afterEach(() => {
    live.splice(0).forEach((connection) => connection.halt());
    opened.length = 0;
    closed.length = 0;
  });

  test('a socket opened on the LAN is recycled when the route moves to the relay', async () => {
    const connection = await connectedOn(undefined);
    expect(opened).toEqual(['wss://argus.local:7025/sync']);

    connection.followRoute('lan');
    expect(closed).toEqual([]);

    connection.followRoute('relay');
    expect(closed).toEqual(['The route to the home changed']);
  });

  test('a socket opened through the relay is recycled when the home answers on the LAN again', async () => {
    const connection = await connectedOn('relay');
    expect(opened).toEqual(['wss://sync--0123456789abcdef0123456789abcdef.argus-tunnel.lynk.page/sync']);

    connection.followRoute('relay');
    expect(closed).toEqual([]);

    connection.followRoute('lan');
    expect(closed).toEqual(['The route to the home changed']);
  });

  test('with no socket there is nothing to move', () => {
    const connection = new SyncConnection(hooks);
    live.push(connection);
    connection.followRoute('relay');
    expect(closed).toEqual([]);
  });
});
