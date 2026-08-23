import { describe, expect, test } from 'bun:test';
import { cameraDetailState } from '../src/shared/libs/camera-detail-state';

describe('cameraDetailState', () => {
  test('keeps the detail mounted until the local camera query has answered', () => {
    expect(cameraDetailState({ cameraFound: false, camerasReady: false })).toBe('pending');
  });

  test('marks a missing camera only after the local query has answered', () => {
    expect(cameraDetailState({ cameraFound: false, camerasReady: true })).toBe('missing');
  });

  test('renders a local camera as soon as it is available', () => {
    expect(cameraDetailState({ cameraFound: true, camerasReady: false })).toBe('ready');
  });
});
