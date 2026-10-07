import { describe, expect, test } from 'bun:test';
import type { IArgusSocket, ICameraMediaSink } from '@/core/interfaces';
import type { CameraLiveNotice, CameraStreamState, SessionCredential, SessionRefreshOutcome } from '@/core/types';
import {
  mediaCloseAction,
  readAuthReply,
  renewalDelayMs,
  rtcRefusalReason,
  subscribeNotice,
  viewerLimitNotice,
} from '@/features/cameras/model/media-access';
import { CameraMediaSession, type CameraMediaDeps } from '@/features/cameras/services/camera-media-session';

const RENEW_MS = 40;

const settle = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

class FakeSocket implements IArgusSocket {
  sent: string[] = [];
  closedWith: number | null = null;
  onOpen: (() => void) | null = null;
  onMessage: IArgusSocket['onMessage'] = null;
  onError: IArgusSocket['onError'] = null;
  onClose: IArgusSocket['onClose'] = null;

  constructor(readonly token: string) {}

  sendText(message: string): void {
    this.sent.push(message);
  }
  sendBinary(): void {}
  close(code = 1000): void {
    this.closedWith = code;
  }
  frames(type: string): unknown[] {
    return this.sent
      .map((raw) => JSON.parse(raw) as { type: string; payload: unknown })
      .filter((frame) => frame.type === type)
      .map((frame) => frame.payload);
  }
  reply(frame: object): void {
    this.onMessage?.(JSON.stringify(frame), null);
  }
}

type Harness = {
  session: CameraMediaSession;
  sockets: FakeSocket[];
  states: CameraStreamState[];
  notices: (CameraLiveNotice | null)[];
  refreshes: SessionCredential[];
  setToken: (token: string) => void;
  setRefresh: (outcome: SessionRefreshOutcome, next?: string) => void;
};

const sink: ICameraMediaSink = {
  resetStream: () => undefined,
  pushFragment: () => undefined,
  bufferedBytes: () => 0,
};

function harness(): Harness {
  let credential: SessionCredential = { accessToken: 'token-1', version: 1 };
  let outcome: SessionRefreshOutcome = 'refreshed';
  let afterRefresh = 'token-2';
  const listeners = new Set<(token: string | null) => void>();
  const sockets: FakeSocket[] = [];
  const states: CameraStreamState[] = [];
  const notices: (CameraLiveNotice | null)[] = [];
  const refreshes: SessionCredential[] = [];
  const setToken = (token: string) => {
    credential = { accessToken: token, version: credential.version };
    for (const listener of listeners) listener(token);
  };
  const deps: CameraMediaDeps = {
    openSocket: async (token) => {
      const socket = new FakeSocket(token);
      sockets.push(socket);
      return socket;
    },
    credential: () => credential,
    refresh: async (failed) => {
      refreshes.push(failed);
      if (outcome === 'refreshed') setToken(afterRefresh);
      return outcome;
    },
    watchAccessToken: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    renewIntervalMs: RENEW_MS,
  };
  const session = new CameraMediaSession(
    {
      cameraId: 7,
      quality: 'sub',
      sink,
      events: {
        onState: (state) => states.push(state),
        onNotice: (notice) => notices.push(notice),
      },
    },
    deps,
  ).start();
  return {
    session,
    sockets,
    states,
    notices,
    refreshes,
    setToken,
    setRefresh: (next, token) => {
      outcome = next;
      if (token) afterRefresh = token;
    },
  };
}

async function opened(h: Harness, index = 0): Promise<FakeSocket> {
  await settle();
  const socket = h.sockets[index];
  if (!socket) throw new Error(`socket ${index} was never opened`);
  socket.onOpen?.();
  return socket;
}

describe('media access model', () => {
  test('a policy close names what the app does next', () => {
    expect(mediaCloseAction(1008, 'session_expired')).toBe('refresh');
    expect(mediaCloseAction(1008, 'role_changed')).toBe('reconnect');
    expect(mediaCloseAction(1008, 'slow_consumer')).toBe('reconnect');
    expect(mediaCloseAction(1008, 'something_else')).toBe('retry');
    expect(mediaCloseAction(1006, 'session_expired')).toBe('retry');
  });

  test('viewer limits and a disabled camera become notices', () => {
    expect(viewerLimitNotice('too_many_viewers')).toBe('viewers-total');
    expect(viewerLimitNotice('too_many_viewers_for_camera')).toBe('viewers-camera');
    expect(viewerLimitNotice('too_many_viewers_for_user')).toBe('viewers-user');
    expect(viewerLimitNotice('Too many camera subscriptions')).toBeNull();
    expect(subscribeNotice(409, 'This camera is disabled')).toBe('camera-disabled');
    expect(subscribeNotice(429, 'too_many_viewers_for_camera')).toBe('viewers-camera');
    expect(subscribeNotice(429, 'Too many camera subscriptions')).toBeNull();
    expect(subscribeNotice(403, 'Forbidden')).toBeNull();
  });

  test('a WebRTC refusal keeps the viewer limit it was refused for', () => {
    expect(rtcRefusalReason(429, { code: 'TOO_MANY_REQUESTS', message: 'too_many_viewers_for_user' })).toBe(
      'too_many_viewers_for_user',
    );
    expect(rtcRefusalReason(503, { code: 'SERVICE_UNAVAILABLE', message: 'webrtc_unavailable' })).toBe(
      'SERVICE_UNAVAILABLE',
    );
    expect(rtcRefusalReason(502, null)).toBe('CAMERA_RTC_502');
  });

  test('auth replies are read by type and status', () => {
    expect(readAuthReply({ type: 'camera:auth:ok', payload: { role: 'guard' } })).toEqual({
      kind: 'renewed',
      role: 'guard',
    });
    expect(readAuthReply({ type: 'camera:auth_error', status: 429 })).toEqual({ kind: 'throttled' });
    expect(readAuthReply({ type: 'camera:auth_error', status: 409 })).toEqual({ kind: 'refused', status: 409 });
    expect(readAuthReply({ type: 'camera:ready' })).toBeNull();
  });

  test('renewals wait out the server interval', () => {
    expect(renewalDelayMs(0, 5_000, 10_500)).toBe(0);
    expect(renewalDelayMs(1_000, 5_000, 10_500)).toBe(6_500);
    expect(renewalDelayMs(1_000, 20_000, 10_500)).toBe(0);
  });
});

describe('camera media session access', () => {
  test('a rotated token is sent in band and the picture keeps its socket', async () => {
    const h = harness();
    const socket = await opened(h);
    h.setToken('token-2');
    await settle(5);
    expect(socket.frames('camera:auth')).toEqual([{ token: 'token-2' }]);
    socket.reply({ type: 'camera:auth:ok', payload: { role: 'owner' } });
    expect(h.sockets).toHaveLength(1);
    expect(socket.closedWith).toBeNull();
    h.session.close();
  });

  test('renewals are debounced to one per interval and carry the newest token', async () => {
    const h = harness();
    const socket = await opened(h);
    h.setToken('token-2');
    await settle(5);
    h.setToken('token-3');
    h.setToken('token-4');
    await settle(5);
    expect(socket.frames('camera:auth')).toEqual([{ token: 'token-2' }]);
    socket.reply({ type: 'camera:auth:ok', payload: { role: 'owner' } });
    await settle(RENEW_MS + 10);
    expect(socket.frames('camera:auth')).toEqual([{ token: 'token-2' }, { token: 'token-4' }]);
    h.session.close();
  });

  test('a throttled renewal is sent again after the interval', async () => {
    const h = harness();
    const socket = await opened(h);
    h.setToken('token-2');
    await settle(5);
    socket.reply({ type: 'camera:auth_error', status: 429, error: 'slow down' });
    await settle(RENEW_MS + 10);
    expect(socket.frames('camera:auth')).toEqual([{ token: 'token-2' }, { token: 'token-2' }]);
    h.session.close();
  });

  test('session_expired refreshes the token it failed with and reconnects at once', async () => {
    const h = harness();
    const socket = await opened(h);
    socket.onClose?.(1008, 'session_expired');
    await settle(5);
    expect(h.refreshes).toEqual([{ accessToken: 'token-1', version: 1 }]);
    expect(h.sockets).toHaveLength(2);
    expect(h.sockets[1]?.token).toBe('token-2');
    const next = await opened(h, 1);
    expect(next.frames('camera:subscribe')).toHaveLength(1);
    h.session.close();
  });

  test('a rejected refresh ends the view with a session notice', async () => {
    const h = harness();
    h.setRefresh('rejected');
    const socket = await opened(h);
    socket.onClose?.(1008, 'session_expired');
    await settle(5);
    expect(h.sockets).toHaveLength(1);
    expect(h.states.at(-1)).toBe('unavailable');
    expect(h.notices.at(-1)).toBe('session-ended');
    h.session.close();
  });

  test('role_changed and slow_consumer reconnect without a refresh', async () => {
    const h = harness();
    const socket = await opened(h);
    socket.onClose?.(1008, 'role_changed');
    await settle(5);
    expect(h.refreshes).toHaveLength(0);
    expect(h.sockets).toHaveLength(2);
    const next = await opened(h, 1);
    next.onClose?.(1008, 'slow_consumer');
    await settle(5);
    expect(h.sockets).toHaveLength(3);
    h.session.close();
  });

  test('a disabled camera stops retrying and says so', async () => {
    const h = harness();
    const socket = await opened(h);
    socket.reply({ type: 'camera:subscribe_error', status: 409, error: 'This camera is disabled' });
    expect(h.states.at(-1)).toBe('unavailable');
    expect(h.notices.at(-1)).toBe('camera-disabled');
    h.session.close();
  });

  test('a full camera keeps trying and names the limit', async () => {
    const h = harness();
    const socket = await opened(h);
    socket.reply({ type: 'camera:subscribe_error', status: 429, error: 'too_many_viewers_for_camera' });
    expect(h.states.at(-1)).toBe('reconnecting');
    expect(h.notices.at(-1)).toBe('viewers-camera');
    h.session.close();
  });
});
