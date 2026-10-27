import { describe, expect, test } from 'bun:test';
import { cameraFaceOf } from '@/shared/libs/camera-face';

describe('what a camera tile shows', () => {
  test('a live camera says En vivo only once a frame is painted', () => {
    expect(cameraFaceOf({ state: 'live', framed: true, reachable: true })).toEqual({
      live: true,
      dormant: undefined,
      stale: false,
    });
    expect(cameraFaceOf({ state: 'live', framed: false, reachable: true }).live).toBe(false);
  });

  test('with Argus unreachable or the camera offline, the last frame stays and is marked stale', () => {
    expect(cameraFaceOf({ state: 'live', framed: true, reachable: false })).toEqual({
      live: false,
      dormant: undefined,
      stale: true,
    });
    expect(cameraFaceOf({ state: 'offline', framed: true, reachable: true }).stale).toBe(true);
    expect(cameraFaceOf({ state: 'offline', framed: false, reachable: true }).dormant).toBe('off');
  });

  test('a private or switched-off camera never shows a frame', () => {
    expect(cameraFaceOf({ state: 'private', framed: true, reachable: true }).dormant).toBe(
      'privacy'
    );
    expect(cameraFaceOf({ state: 'off', framed: true, reachable: false }).dormant).toBe('off');
  });
});
