import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
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

type Scheduled = { run: () => void; cancelled: boolean };

let token: string | null = 'token';
const sockets: IArgusSocket[] = [];
const closed: IArgusSocket[] = [];
const scheduled: Scheduled[] = [];
const realSetTimeout = globalThis.setTimeout;
const realClearTimeout = globalThis.clearTimeout;
const page = new EventTarget();
const ownWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

const fakeSocket = (): IArgusSocket => {
  const socket: IArgusSocket = {
    onOpen: null,
    onMessage: null,
    onError: null,
    onClose: null,
    sendText: () => undefined,
    sendBinary: () => undefined,
    close: () => {
      closed.push(socket);
      socket.onClose?.(1000, '');
    },
  };
  return socket;
};

mock.module('@/core/services/net', () => ({
  netService: {
    instance: async () => paired,
    refreshAddress: async () => false,
  },
}));

const { SyncConnection } = await import('@/core/services/sync/sync-connection');
const { watchPageLifecycle } = await import('@/core/services/sync/sync-page-lifecycle.web');

const hooks = {
  openSocket: async () => {
    const socket = fakeSocket();
    sockets.push(socket);
    return socket;
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

const capture = (run: () => void, ms?: number) => {
  if (ms !== undefined && ms >= WS_RECONNECT_BASE_MS / 2) {
    const entry = { run, cancelled: false };
    scheduled.push(entry);
    return entry;
  }
  return realSetTimeout(run, ms);
};

const release = (handle: unknown) => {
  const entry = scheduled.find((candidate) => candidate === handle);
  if (entry) entry.cancelled = true;
  else realClearTimeout(handle as ReturnType<typeof setTimeout>);
};

const pending = (): Scheduled[] => scheduled.filter((entry) => !entry.cancelled);

const settle = () => new Promise((resolve) => realSetTimeout(resolve, 0));

const showPage = (persisted: boolean): void => {
  const event = new Event('pageshow');
  Object.defineProperty(event, 'persisted', { value: persisted });
  page.dispatchEvent(event);
};

const connectedPage = async () => {
  const connection = new SyncConnection(hooks);
  const stop = watchPageLifecycle({
    leave: () => {
      connection.halt();
      connection.release();
    },
    back: () => void connection.connect(),
  });
  const attempt = connection.connect();
  await settle();
  sockets.at(-1)?.onOpen?.();
  await attempt;
  return { connection, stop };
};

describe('a page that leaves for the back-forward cache holds no /sync socket', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'window', {
      value: page,
      configurable: true,
      writable: true,
    });
    globalThis.setTimeout = capture as unknown as typeof setTimeout;
    globalThis.clearTimeout = release as typeof clearTimeout;
  });

  afterEach(() => {
    if (ownWindow) Object.defineProperty(globalThis, 'window', ownWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    globalThis.setTimeout = realSetTimeout;
    globalThis.clearTimeout = realClearTimeout;
    scheduled.length = 0;
    sockets.length = 0;
    closed.length = 0;
    token = 'token';
  });

  test('leaving closes the open socket and its close schedules no reconnect', async () => {
    const { connection, stop } = await connectedPage();
    expect(connection.hasSocket).toBe(true);
    page.dispatchEvent(new Event('pagehide'));
    expect(closed).toEqual(sockets);
    expect(connection.hasSocket).toBe(false);
    expect(pending()).toEqual([]);
    stop();
  });

  test('the late-token reconnect pending when the page leaves never opens a socket while it is away', async () => {
    token = null;
    const connection = new SyncConnection(hooks);
    const stop = watchPageLifecycle({
      leave: () => {
        connection.halt();
        connection.release();
      },
      back: () => void connection.connect(),
    });
    expect(await connection.connect()).toBe(false);
    expect(pending()).toHaveLength(1);
    token = 'token';
    page.dispatchEvent(new Event('pagehide'));
    expect(pending()).toEqual([]);
    await settle();
    expect(sockets).toEqual([]);
    stop();
    connection.halt();
  });

  test('coming back from the cache opens exactly one socket, and a fresh load is left to the boot', async () => {
    const { connection, stop } = await connectedPage();
    page.dispatchEvent(new Event('pagehide'));
    showPage(false);
    await settle();
    expect(sockets).toHaveLength(1);
    showPage(true);
    showPage(true);
    await settle();
    await settle();
    expect(sockets).toHaveLength(2);
    expect(closed).toEqual(sockets.slice(0, 1));
    stop();
    connection.halt();
    connection.release();
  });
});
