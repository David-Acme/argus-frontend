import { describe, expect, mock, test } from 'bun:test';

const calls: string[] = [];

mock.module('@/core/services/storage', () => ({
  storageService: { getBoolean: () => false, set: () => undefined },
}));
mock.module('expo-audio', () => ({
  getRecordingPermissionsAsync: async () => ({ granted: true, canAskAgain: true }),
  requestRecordingPermissionsAsync: async () => ({ granted: true, canAskAgain: true }),
}));
mock.module('expo-notifications', () => ({
  getPermissionsAsync: async () => ({ granted: true, canAskAgain: true }),
  requestPermissionsAsync: async () => ({ granted: true, canAskAgain: true }),
}));
mock.module('expo-camera', () => ({
  Camera: {
    getCameraPermissionsAsync: async () => {
      calls.push('camera:read');
      return { granted: false, canAskAgain: true, status: 'undetermined', expires: 'never' };
    },
    requestCameraPermissionsAsync: async () => {
      calls.push('camera:request');
      return { granted: true, canAskAgain: true, status: 'granted', expires: 'never' };
    },
  },
}));
const { permissionsService } = await import('@/core/services/permissions/permissions.native');

describe('the camera is a runtime permission the app reads and asks itself', () => {
  test('reading the camera asks the camera, not another permission', async () => {
    expect(await permissionsService.read('camera')).toEqual({ granted: false, canAskAgain: true });
    expect(await permissionsService.request('camera')).toEqual({ granted: true, canAskAgain: true });
    expect(calls).toEqual(['camera:read', 'camera:request']);
  });
});
