import { describe, expect, test } from 'bun:test';
import type { IArgusSocket, ICameraMediaSession, IVoiceMic } from '@/core/interfaces';
import type { SessionCredential, SessionRefreshOutcome } from '@/core/types';
import { CameraCallSession, type CameraCallDeps } from '@/features/cameras/services/camera-call-session';
import { MediaAccessRenewal } from '@/features/cameras/services/media-access-renewal';

const RENEW_MS = 40;

const settle = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

class FakeSocket implements IArgusSocket {
  sent: string[] = [];
  closed = false;
  onOpen: (() => void) | null = null;
  onMessage: IArgusSocket['onMessage'] = null;
  onError: IArgusSocket['onError'] = null;
  onClose: IArgusSocket['onClose'] = null;

  constructor(readonly token: string) {}

  sendText(message: string): void {
    this.sent.push(message);
  }
  sendBinary(): void {}
  close(): void {
    this.closed = true;
  }
  types(): string[] {
    return this.sent.map((raw) => (JSON.parse(raw) as { type: string }).type);
  }
  tokens(): string[] {
    return this.sent
      .map((raw) => JSON.parse(raw) as { type: string; payload: { token?: string } })
      .filter((frame) => frame.type === 'camera:auth')
      .map((frame) => frame.payload.token ?? '');
  }
  reply(frame: object): void {
    this.onMessage?.(JSON.stringify(frame), null);
  }
}

const mic: IVoiceMic = {
  start: () => undefined,
  stop: () => undefined,
  playerStart: () => undefined,
  playerWrite: () => undefined,
  playerFlush: () => undefined,
  playerStop: () => undefined,
  playedSamples: () => 0,
  onData: null,
  onError: null,
  onPlayerIdle: null,
};

function harness() {
  let credential: SessionCredential = { accessToken: 'token-1', version: 1 };
  let outcome: SessionRefreshOutcome = 'refreshed';
  const listeners = new Set<(token: string | null) => void>();
  const sockets: FakeSocket[] = [];
  const refreshes: SessionCredential[] = [];
  const setToken = (token: string) => {
    credential = { accessToken: token, version: credential.version };
    for (const listener of listeners) listener(token);
  };
  const deps: CameraCallDeps = {
    openSocket: async (token) => {
      const socket = new FakeSocket(token);
      sockets.push(socket);
      return socket;
    },
    credential: () => credential,
    refresh: async (failed) => {
      refreshes.push(failed);
      if (outcome === 'refreshed') setToken('token-2');
      return outcome;
    },
    watchAccessToken: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    renewIntervalMs: RENEW_MS,
    openListen: async () => ({ retry: () => undefined, close: () => undefined }) satisfies ICameraMediaSession,
    createMic: () => mic,
  };
  const call = new CameraCallSession({ cameraId: '3', mode: 'call', listen: false }, deps);
  return {
    call,
    sockets,
    refreshes,
    listeners,
    setToken,
    reject: () => {
      outcome = 'rejected';
    },
  };
}

async function liveLine(h: ReturnType<typeof harness>, index = 0): Promise<FakeSocket> {
  await settle();
  const socket = h.sockets[index];
  if (!socket) throw new Error(`socket ${index} was never opened`);
  socket.onOpen?.();
  socket.reply({ type: 'camera:talk:ready', payload: {} });
  return socket;
}

describe('the talk line renews its access like the live view', () => {
  test('a rotated token is sent on the open talk socket, debounced to one per interval', async () => {
    const h = harness();
    void h.call.start();
    const socket = await liveLine(h);
    h.setToken('token-2');
    await settle(5);
    h.setToken('token-3');
    await settle(5);
    expect(socket.tokens()).toEqual(['token-2']);
    socket.reply({ type: 'camera:auth:ok', payload: { role: 'owner' } });
    await settle(RENEW_MS + 10);
    expect(socket.tokens()).toEqual(['token-2', 'token-3']);
    expect(h.call.current.state).toBe('live');
    h.call.end();
    expect(h.listeners.size).toBe(0);
  });

  test('session_expired refreshes the failed token and reopens the line', async () => {
    const h = harness();
    void h.call.start();
    const socket = await liveLine(h);
    socket.onClose?.(1008, 'session_expired');
    await settle(5);
    expect(h.refreshes).toEqual([{ accessToken: 'token-1', version: 1 }]);
    expect(h.sockets).toHaveLength(2);
    expect(h.sockets[1]?.token).toBe('token-2');
    const next = await liveLine(h, 1);
    expect(next.types()).toContain('camera:talk:start');
    expect(h.call.current.state).toBe('live');
    h.call.end();
  });

  test('a rejected refresh ends the call with its own reason', async () => {
    const h = harness();
    h.reject();
    void h.call.start();
    const socket = await liveLine(h);
    socket.onClose?.(1008, 'session_expired');
    await settle(5);
    expect(h.sockets).toHaveLength(1);
    expect(h.call.current.error).toBe('session-ended');
    expect(h.call.current.state).toBe('idle');
    h.call.end();
  });

  test('role_changed reopens without a refresh, and repeated closes stop reopening', async () => {
    const h = harness();
    void h.call.start();
    await settle();
    for (let index = 0; index < 3; index += 1) {
      const socket = h.sockets[index];
      socket?.onOpen?.();
      socket?.onClose?.(1008, 'role_changed');
      await settle(5);
    }
    expect(h.refreshes).toHaveLength(0);
    expect(h.sockets).toHaveLength(3);
    expect(h.call.current.closedReason).toBe('role_changed');
    h.call.end();
  });
});

describe('media access renewal', () => {
  test('a refused renewal is reported and a detached socket sends nothing', async () => {
    const listeners = new Set<(token: string | null) => void>();
    let credential: SessionCredential = { accessToken: 'a', version: 1 };
    const refused: number[] = [];
    const renewal = new MediaAccessRenewal(
      {
        credential: () => credential,
        watchAccessToken: (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        renewIntervalMs: RENEW_MS,
      },
      (status) => refused.push(status),
    );
    const socket = new FakeSocket('a');
    renewal.attach(socket, credential);
    renewal.opened();
    credential = { accessToken: 'b', version: 1 };
    for (const listener of listeners) listener('b');
    await settle(5);
    expect(socket.tokens()).toEqual(['b']);
    expect(renewal.handle({ type: 'camera:auth_error', status: 409 })).toBe(true);
    expect(refused).toEqual([409]);
    expect(renewal.credential?.accessToken).toBe('a');
    renewal.detach();
    credential = { accessToken: 'c', version: 1 };
    for (const listener of listeners) listener('c');
    await settle(RENEW_MS + 10);
    expect(socket.tokens()).toEqual(['b']);
    renewal.dispose();
    expect(listeners.size).toBe(0);
  });
});
