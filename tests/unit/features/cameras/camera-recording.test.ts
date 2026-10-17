import { describe, expect, test } from 'bun:test';
import type { ICameraRecordingState } from '@/core/interfaces';
import { matchesResourceMatch, readResourceNotice } from '@/core/services/sync/resource-signal';
import {
  CAMERA_RECORDING_RESOURCES,
  recordingPaused,
} from '@/features/cameras/model/camera-recording';

const state = (overrides: Partial<ICameraRecordingState> = {}): ICameraRecordingState => ({
  paused: false,
  freeGb: 12,
  minFreeGb: 20,
  freeBytes: 12 * 1024 ** 3,
  ...overrides,
});

describe('the camera recording state', () => {
  test('the frame the backend sends for the recording scope is read and reloads the recording state', () => {
    const notice = readResourceNotice({ domain: 'camera', kind: 'resource', scope: 'recording' });
    expect(notice?.domain).toBe('camera');
    expect(notice?.scope).toBe('recording');
    expect(notice !== null && matchesResourceMatch(CAMERA_RECORDING_RESOURCES, notice)).toBe(true);
    expect(
      matchesResourceMatch(CAMERA_RECORDING_RESOURCES, { domain: 'camera', scope: 'clips', ids: [] }),
    ).toBe(false);
    expect(
      matchesResourceMatch(CAMERA_RECORDING_RESOURCES, { domain: 'guard', scope: 'recording', ids: [] }),
    ).toBe(false);
  });

  test('the banner follows the recorder flag alone', () => {
    expect(recordingPaused(null)).toBe(false);
    expect(recordingPaused(undefined)).toBe(false);
    expect(recordingPaused(state())).toBe(false);
    expect(recordingPaused(state({ paused: true, freeGb: 4, minFreeGb: 20 }))).toBe(true);
  });
});
