import { describe, expect, test } from 'bun:test';
import { useAuthStore } from '@/core/stores/auth.store';
import {
  lastCameraFrames,
  rememberCameraFrame,
} from '@/features/cameras/services/camera-frame-cache';

describe('the last camera frames', () => {
  test('a frame painted once is there at once for the next screen, only for the cameras asked', () => {
    useAuthStore.setState({ status: 'signed-in' });
    rememberCameraFrame('3', 'data:image/jpeg;base64,AAAA');
    rememberCameraFrame('4', 'data:image/jpeg;base64,BBBB');
    expect([...lastCameraFrames(['3', '9'])]).toEqual([['3', 'data:image/jpeg;base64,AAAA']]);
  });

  test('signing out forgets every frame', () => {
    useAuthStore.setState({ status: 'signed-in' });
    rememberCameraFrame('3', 'data:image/jpeg;base64,AAAA');
    useAuthStore.setState({ status: 'signed-out' });
    expect(lastCameraFrames(['3']).size).toBe(0);
  });
});
