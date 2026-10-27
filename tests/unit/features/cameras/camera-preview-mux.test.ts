import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { IArgusSocket, ICameraMediaSink } from '@/core/interfaces';
import type { PreviewState } from '@/features/cameras/model/camera-preview';

mock.module('@/features/cameras/services/camera-media.service', () => ({ mediaDeps: {} }));

const { CameraPreviewMux } = await import('@/features/cameras/services/camera-preview-mux');

type Sent = { type: string; payload: Record<string, unknown> };

class FakeSocket implements IArgusSocket {
  sent: Sent[] = [];
  closed = false;
  onOpen: (() => void) | null = null;
  onMessage: ((message: string | null, data: ArrayBuffer | null) => void) | null = null;
  onError: ((code: string, message: string) => void) | null = null;
  onClose: ((code: number, reason: string) => void) | null = null;
  sendText(message: string): void {
    this.sent.push(JSON.parse(message) as Sent);
  }
  sendBinary(): void {}
  close(): void {
    this.closed = true;
  }
  reply(type: string, payload: Record<string, unknown> = {}, status?: number): void {
    this.onMessage?.(JSON.stringify({ type, payload, status }), null);
  }
  binary(type: number, subId: number, payload: readonly number[]): void {
    const frame = new Uint8Array([
      0xa7,
      1,
      type,
      1,
      subId >> 8,
      subId & 0xff,
      0,
      0,
      0,
      0,
      0,
      1,
      ...payload,
    ]);
    this.onMessage?.(null, frame.buffer);
  }
  subscribes(): number[] {
    return this.sent
      .filter((frame) => frame.type === 'camera:subscribe')
      .map((frame) => frame.payload.cameraId as number);
  }
}

class FakeSink implements ICameraMediaSink {
  pushed: number[] = [];
  resets = 0;
  resetStream(): void {
    this.resets += 1;
  }
  pushFragment(type: number): void {
    this.pushed.push(type);
  }
  bufferedBytes(): number {
    return 0;
  }
}

function box(type: string, body: readonly number[]): number[] {
  const size = body.length + 8;
  return [0, 0, size >> 8, size & 0xff, ...[...type].map((c) => c.charCodeAt(0)), ...body];
}

const MEDIA = [...box('moof', [0, 0, 0, 0]), ...box('mdat', [1, 2, 3])];

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

let sockets: FakeSocket[] = [];

const deps = {
  openSocket: async () => {
    const socket = new FakeSocket();
    sockets.push(socket);
    return socket;
  },
  credential: () => ({ accessToken: 'token', version: 1 }),
  refresh: async () => 'refreshed' as const,
  watchAccessToken: () => () => undefined,
  renewIntervalMs: 60_000,
};

function tile(cameraId: number, order: number) {
  const sink = new FakeSink();
  const states: PreviewState[] = [];
  return {
    sink,
    states,
    entry: {
      cameraId,
      order,
      fastStart: false,
      sink,
      onState: (s: PreviewState) => states.push(s),
    },
  };
}

let detachers: (() => void)[] = [];

beforeEach(() => {
  sockets = [];
  detachers = [];
});

afterEach(() => {
  for (const detach of detachers) detach();
});

async function opened(
  mux: InstanceType<typeof CameraPreviewMux>,
  tiles: ReturnType<typeof tile>[]
) {
  for (const each of tiles) detachers.push(mux.attach(each.entry));
  await settle();
  const socket = sockets[0];
  if (!socket) throw new Error('no socket');
  socket.onOpen?.();
  return socket;
}

describe('the preview socket', () => {
  test('every tile shares one socket and subscribes one at a time, in tile order', async () => {
    const mux = new CameraPreviewMux(deps);
    const socket = await opened(mux, [tile(3, 2), tile(1, 0), tile(2, 1)]);
    expect(sockets).toHaveLength(1);
    expect(socket.subscribes()).toEqual([1]);
    socket.reply('camera:ready', { subId: 10, cameraId: 1 });
    expect(socket.subscribes()).toEqual([1, 2]);
    socket.reply('camera:ready', { subId: 11, cameraId: 2 });
    socket.reply('camera:ready', { subId: 12, cameraId: 3 });
    expect(socket.subscribes()).toEqual([1, 2, 3]);
    expect(
      socket.sent.every(
        (frame) => frame.type !== 'camera:subscribe' || frame.payload.preview === true
      )
    ).toBe(true);
  });

  test('frames reach the tile their subscription belongs to, and the first media makes it live', async () => {
    const mux = new CameraPreviewMux(deps);
    const first = tile(1, 0);
    const second = tile(2, 1);
    const socket = await opened(mux, [first, second]);
    socket.reply('camera:ready', { subId: 10 });
    socket.reply('camera:ready', { subId: 11 });
    socket.binary(1, 11, [9]);
    socket.binary(2, 11, MEDIA);
    expect(second.sink.pushed).toEqual([1, 2]);
    expect(first.sink.pushed).toEqual([]);
    expect(second.states.at(-1)).toBe('live');
    expect(first.states.at(-1)).toBe('connecting');
  });

  test('frames that arrive before the answer belong to the subscription being asked', async () => {
    const mux = new CameraPreviewMux(deps);
    const only = tile(5, 0);
    const socket = await opened(mux, [only]);
    socket.binary(1, 40, [9]);
    socket.reply('camera:ready', { subId: 40 });
    socket.binary(2, 40, MEDIA);
    expect(only.sink.pushed).toEqual([1, 2]);
  });

  test('a refused tile waits and the next tile is asked at once', async () => {
    const mux = new CameraPreviewMux(deps);
    const socket = await opened(mux, [tile(1, 0), tile(2, 1)]);
    socket.reply('camera:subscribe_error', {}, 429);
    expect(socket.subscribes()).toEqual([1, 2]);
  });

  test('leaving a tile unsubscribes it, and the socket closes only after the last one has lingered', async () => {
    const mux = new CameraPreviewMux(deps);
    const only = tile(1, 0);
    const detach = mux.attach(only.entry);
    await settle();
    const socket = sockets[0];
    if (!socket) throw new Error('no socket');
    socket.onOpen?.();
    socket.reply('camera:ready', { subId: 7 });
    detach();
    expect(socket.sent.at(-1)).toEqual({ type: 'camera:unsubscribe', payload: { subId: 7 } });
    expect(socket.closed).toBe(false);
  });

  test('a closed subscription resets its tile instead of blanking the others', async () => {
    const mux = new CameraPreviewMux(deps);
    const first = tile(1, 0);
    const second = tile(2, 1);
    const socket = await opened(mux, [first, second]);
    socket.reply('camera:ready', { subId: 10 });
    socket.reply('camera:ready', { subId: 11 });
    socket.binary(2, 11, MEDIA);
    socket.reply('camera:closed', { subId: 10, reason: 'upstream_stalled' });
    expect(first.sink.resets).toBeGreaterThan(0);
    expect(second.states.at(-1)).toBe('live');
  });
});
