import { describe, expect, test } from 'bun:test';
import {
  afterRtcFailure,
  afterRtcSuccess,
  firstTransport,
  hasFirstFrame,
  INITIAL_RTC_BACKOFF,
  isRtcStalled,
  readRtcStats,
  rtcStreamStats,
  type RtcStatsReport,
} from '@/features/cameras/model/camera-transport';
import {
  CAMERA_RTC_BACKOFF_BASE_MS,
  CAMERA_RTC_BACKOFF_MAX_MS,
} from '@/features/cameras/constants';

function report(stats: readonly object[]): RtcStatsReport {
  return { forEach: (callback) => stats.forEach((stat) => callback(stat)) };
}

describe('which transport a live view starts on', () => {
  test('WebRTC first whenever the platform has it and no failure is cooling down', () => {
    expect(firstTransport({ rtcSupported: true, backoff: INITIAL_RTC_BACKOFF, now: 1000 })).toBe(
      'webrtc'
    );
    expect(firstTransport({ rtcSupported: false, backoff: INITIAL_RTC_BACKOFF, now: 1000 })).toBe(
      'ws'
    );
  });

  test('a failure sends the next views to the WebSocket until the backoff ends, doubling up to a cap', () => {
    const once = afterRtcFailure(INITIAL_RTC_BACKOFF, 1000);
    expect(once).toEqual({ failures: 1, retryAt: 1000 + CAMERA_RTC_BACKOFF_BASE_MS });
    expect(
      firstTransport({
        rtcSupported: true,
        backoff: once,
        now: 1000 + CAMERA_RTC_BACKOFF_BASE_MS - 1,
      })
    ).toBe('ws');
    expect(
      firstTransport({ rtcSupported: true, backoff: once, now: 1000 + CAMERA_RTC_BACKOFF_BASE_MS })
    ).toBe('webrtc');
    const twice = afterRtcFailure(once, 5000);
    expect(twice.retryAt).toBe(5000 + 2 * CAMERA_RTC_BACKOFF_BASE_MS);
    let many = twice;
    for (let index = 0; index < 12; index += 1) many = afterRtcFailure(many, 0);
    expect(many.retryAt).toBe(CAMERA_RTC_BACKOFF_MAX_MS);
    expect(afterRtcSuccess()).toEqual(INITIAL_RTC_BACKOFF);
  });
});

describe('reading a WebRTC stats report', () => {
  const inbound = (kind: string, extra: object) => ({ type: 'inbound-rtp', kind, ...extra });

  test('size, decoded frames and audio packets come from the inbound streams only', () => {
    const reading = readRtcStats(
      report([
        inbound('video', { framesDecoded: 30, frameWidth: 2688, frameHeight: 1520 }),
        inbound('audio', { packetsReceived: 50 }),
        { type: 'outbound-rtp', kind: 'video', framesDecoded: 999 },
        { type: 'candidate-pair', state: 'succeeded' },
      ]),
      2000
    );
    expect(reading).toEqual({
      at: 2000,
      width: 2688,
      height: 1520,
      framesDecoded: 30,
      audioPackets: 50,
    });
    expect(hasFirstFrame(reading)).toBe(true);
  });

  test('older stacks name the kind mediaType, and missing numbers read as zero', () => {
    const reading = readRtcStats(
      report([{ type: 'inbound-rtp', mediaType: 'video', framesDecoded: 'x' }]),
      0
    );
    expect(reading.framesDecoded).toBe(0);
    expect(hasFirstFrame(reading)).toBe(false);
  });

  test('the frame rate is decoded frames over the time between two readings', () => {
    const first = { at: 1000, width: 1280, height: 720, framesDecoded: 10, audioPackets: 40 };
    const second = { at: 2000, width: 1280, height: 720, framesDecoded: 25, audioPackets: 90 };
    expect(rtcStreamStats(first, second)).toEqual({
      width: 1280,
      height: 720,
      fps: 15,
      audio: true,
    });
    expect(rtcStreamStats(second, { ...second, at: 3000 })).toEqual({
      width: 1280,
      height: 720,
      fps: 0,
      audio: false,
    });
    expect(rtcStreamStats(null, second).fps).toBe(0);
  });

  test('a stream stalls when no frame was decoded for the stall window', () => {
    expect(isRtcStalled(1000, 5999, 5000)).toBe(false);
    expect(isRtcStalled(1000, 6000, 5000)).toBe(true);
    expect(isRtcStalled(0, 60000, 5000)).toBe(false);
  });
});
