import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type {
  ICameraLiveStats,
  ICameraMediaOpenInput,
  ICameraMediaSession,
  ICameraRtcOpenInput,
  ICameraRtcSession,
} from '@/core/interfaces';
import type { CameraStreamState, CameraTransport } from '@/core/types';
import * as constants from '@/features/cameras/constants';

const FIRST_FRAME_MS = 40;
const BACKOFF_MS = 60;
const BACKOFF_MAX_MS = 4 * BACKOFF_MS;

class FakeRtc implements ICameraRtcSession {
  readonly stream = { toURL: () => 'stream:1' };
  closed = false;
  audio: boolean[] = [];
  constructor(readonly input: ICameraRtcOpenInput) {}
  setAudioEnabled(enabled: boolean): void {
    this.audio.push(enabled);
  }
  close(): void {
    this.closed = true;
  }
}

class FakeWs implements ICameraMediaSession {
  closed = false;
  retried = 0;
  constructor(readonly input: ICameraMediaOpenInput) {}
  retry(): void {
    this.retried += 1;
  }
  close(): void {
    this.closed = true;
  }
}

let rtcSupported = true;
let rtcPlan: 'answer' | 'refuse' = 'answer';
const rtcSessions: FakeRtc[] = [];
const wsSessions: FakeWs[] = [];

mock.module('@/features/cameras/constants', () => ({
  ...constants,
  CAMERA_RTC_FIRST_FRAME_MS: FIRST_FRAME_MS,
  CAMERA_RTC_BACKOFF_BASE_MS: BACKOFF_MS,
  CAMERA_RTC_BACKOFF_MAX_MS: BACKOFF_MAX_MS,
}));
mock.module('@/core/services/log', () => ({
  log: { debug: () => undefined, error: () => undefined },
}));
mock.module('@/features/cameras/services/camera-rtc', () => ({
  cameraRtcService: {
    supported: () => rtcSupported,
    open: async (input: ICameraRtcOpenInput) => {
      if (rtcPlan === 'refuse') throw new Error('webrtc_unavailable');
      const session = new FakeRtc(input);
      rtcSessions.push(session);
      return session;
    },
  },
}));
mock.module('@/features/cameras/services/camera-media.service', () => ({
  cameraMediaService: {
    open: async (input: ICameraMediaOpenInput) => {
      const session = new FakeWs(input);
      wsSessions.push(session);
      return session;
    },
  },
}));

const { cameraLiveService } = await import('@/features/cameras/services/camera-live.service');

type Recorded = {
  states: CameraStreamState[];
  transports: CameraTransport[];
  stats: ICameraLiveStats[];
  streams: unknown[];
};

const sink = {
  resetStream: () => undefined,
  pushFragment: () => undefined,
  bufferedBytes: () => 0,
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(condition: () => boolean, limitMs: number): Promise<void> {
  const until = Date.now() + limitMs;
  while (!condition() && Date.now() < until) await sleep(5);
}

function open() {
  const recorded: Recorded = { states: [], transports: [], stats: [], streams: [] };
  const session = cameraLiveService.open({
    cameraId: 6,
    quality: 'main',
    fastStart: true,
    sink,
    events: {
      onState: (state) => recorded.states.push(state),
      onTransport: (transport) => recorded.transports.push(transport),
      onStats: (stats) => recorded.stats.push(stats),
      onRtcStream: (stream) => recorded.streams.push(stream),
    },
  });
  return { session, recorded };
}

beforeEach(async () => {
  rtcSupported = true;
  rtcPlan = 'answer';
  rtcSessions.length = 0;
  wsSessions.length = 0;
  await sleep(BACKOFF_MAX_MS + 10);
});

describe('the live view prefers WebRTC and falls back to the WebSocket', () => {
  test('a platform without RTCPeerConnection goes straight to the WebSocket, with no visible failure', async () => {
    rtcSupported = false;
    const { session, recorded } = open();
    await sleep(5);
    expect(rtcSessions).toHaveLength(0);
    expect(wsSessions).toHaveLength(1);
    expect(recorded.transports).toEqual(['ws']);
    wsSessions[0]?.input.events?.onState?.('live');
    wsSessions[0]?.input.events?.onStats?.({ width: 1280, height: 720, fps: 15, audio: true });
    expect(recorded.states).toEqual(['live']);
    expect(recorded.stats[0]?.transport).toBe('ws');
    session.close();
    expect(wsSessions[0]?.closed).toBe(true);
  });

  test('WebRTC that paints a frame is the transport, and the WebSocket is never opened', async () => {
    const { session, recorded } = open();
    await sleep(5);
    const rtc = rtcSessions[0];
    expect(rtc?.input.quality).toBe('main');
    rtc?.input.events.onLive();
    rtc?.input.events.onStats({ width: 2688, height: 1520, fps: 15, audio: true });
    await sleep(FIRST_FRAME_MS + 10);
    expect(recorded.states).toEqual(['connecting', 'live']);
    expect(recorded.transports).toEqual(['webrtc']);
    expect(recorded.stats).toEqual([
      { width: 2688, height: 1520, fps: 15, audio: true, transport: 'webrtc' },
    ]);
    expect(recorded.streams.at(-1)).toBe(rtc?.stream);
    expect(wsSessions).toHaveLength(0);
    session.setAudioEnabled(false);
    expect(rtc?.audio.at(-1)).toBe(false);
    session.close();
    expect(rtc?.closed).toBe(true);
    expect(recorded.states.at(-1)).toBe('closed');
  });

  test('a refused signal falls back at once, and the next view skips WebRTC while it cools down', async () => {
    rtcPlan = 'refuse';
    const first = open();
    await sleep(5);
    expect(wsSessions).toHaveLength(1);
    expect(first.recorded.transports).toEqual(['ws']);
    rtcPlan = 'answer';
    const second = open();
    await sleep(5);
    expect(rtcSessions).toHaveLength(0);
    expect(wsSessions).toHaveLength(2);
    first.session.close();
    second.session.close();
  });

  test('no first frame within the window falls back to the WebSocket', async () => {
    const { session, recorded } = open();
    await sleep(FIRST_FRAME_MS + 15);
    expect(rtcSessions[0]?.closed).toBe(true);
    expect(wsSessions).toHaveLength(1);
    expect(recorded.transports).toEqual(['ws']);
    session.close();
  });

  test('a drop after going live reconnects once over WebRTC, then gives up to the WebSocket', async () => {
    const { session, recorded } = open();
    await sleep(5);
    rtcSessions[0]?.input.events.onLive();
    rtcSessions[0]?.input.events.onDrop('CAMERA_RTC_FAILED');
    await sleep(5);
    expect(rtcSessions).toHaveLength(2);
    expect(recorded.states).toEqual(['connecting', 'live', 'reconnecting']);
    rtcSessions[1]?.input.events.onLive();
    expect(recorded.states.at(-1)).toBe('live');
    rtcSessions[1]?.input.events.onDrop('CAMERA_RTC_STALLED');
    await sleep(5);
    expect(rtcSessions).toHaveLength(3);
    rtcSessions[2]?.input.events.onDrop('CAMERA_RTC_FAILED');
    await sleep(5);
    expect(wsSessions).toHaveLength(1);
    expect(recorded.transports).toEqual(['webrtc', 'ws']);
    session.close();
  });

  test('a view on the WebSocket tries WebRTC again after the backoff and hands over when it paints', async () => {
    rtcPlan = 'refuse';
    const { session, recorded } = open();
    await sleep(5);
    expect(wsSessions).toHaveLength(1);
    wsSessions[0]?.input.events?.onState?.('live');
    rtcPlan = 'answer';
    await waitFor(() => rtcSessions.length > 0, BACKOFF_MAX_MS + 50);
    const upgrade = rtcSessions[0];
    expect(upgrade).toBeDefined();
    expect(recorded.states).toEqual(['connecting', 'live']);
    upgrade?.input.events.onLive();
    expect(wsSessions[0]?.closed).toBe(true);
    expect(recorded.transports).toEqual(['ws', 'webrtc']);
    expect(recorded.states).toEqual(['connecting', 'live']);
    session.close();
  });
});
