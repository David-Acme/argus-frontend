import { describe, expect, test } from 'bun:test';
import { INITIAL_RTC_BACKOFF, firstTransport } from '@/features/cameras/model/camera-transport';
import {
  CAMERA_PREVIEW_TRANSPORT,
  previewPaints,
} from '@/features/cameras/model/camera-preview';

describe('how a card preview runs', () => {
  test('it asks for the shared policy: WebRTC where the platform has it, the WebSocket elsewhere and as the fallback', () => {
    expect(CAMERA_PREVIEW_TRANSPORT.policy).toBe('auto');
    expect(
      firstTransport({ rtcSupported: true, backoff: INITIAL_RTC_BACKOFF, now: 1 })
    ).toBe('webrtc');
    expect(
      firstTransport({ rtcSupported: false, backoff: INITIAL_RTC_BACKOFF, now: 1 })
    ).toBe('ws');
    expect(
      firstTransport({ rtcSupported: true, backoff: { failures: 1, retryAt: 5000 }, now: 1000 })
    ).toBe('ws');
  });

  test('it owns its backoff, so a failing preview never delays the detail view', () => {
    expect(CAMERA_PREVIEW_TRANSPORT.isolatedBackoff).toBe(true);
  });

  test('the snapshot stays under the live layer until a frame is live', () => {
    expect(previewPaints('connecting')).toBe(false);
    expect(previewPaints('reconnecting')).toBe(false);
    expect(previewPaints('offline')).toBe(false);
    expect(previewPaints('unavailable')).toBe(false);
    expect(previewPaints('closed')).toBe(false);
    expect(previewPaints('live')).toBe(true);
  });
});
