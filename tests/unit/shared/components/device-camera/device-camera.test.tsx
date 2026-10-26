import { describe, expect, mock, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import type { CameraView } from 'expo-camera';
import { createRef } from 'react';

type PermissionMethods = {
  getMethod: () => Promise<unknown>;
  requestMethod: () => Promise<unknown>;
};

const hooks: PermissionMethods[] = [];

const granted = { granted: true, canAskAgain: true, status: 'granted', expires: 'never' };
const asked: string[] = [];

type FakeCameraProps = { facing?: string; ref?: unknown };

const refs: unknown[] = [];

mock.module('expo', () => ({
  createPermissionHook: (methods: PermissionMethods) => {
    hooks.push(methods);
    return () => [null, methods.requestMethod, methods.getMethod];
  },
}));

mock.module('@/shared/components/device-camera/expo-camera', () => ({
  Camera: {
    getCameraPermissionsAsync: async () => {
      asked.push('get');
      return granted;
    },
    requestCameraPermissionsAsync: async () => {
      asked.push('request');
      return granted;
    },
  },
  CameraView: ({ facing, ref }: FakeCameraProps) => {
    refs.push(ref);
    return <span>camera {facing}</span>;
  },
}));

const { DeviceCamera } = await import('@/shared/components/device-camera/device-camera');

describe('DeviceCamera', () => {
  test('paints the camera once its module arrives, with its props and ref', async () => {
    const ref = createRef<CameraView>();
    render(<DeviceCamera facing="front" ref={ref} />);
    expect(await screen.findByText('camera front')).toBeDefined();
    expect(refs).toContain(ref);
  });

  test('reads and requests the permission through the loaded module', async () => {
    const [methods] = hooks;
    expect(await methods?.getMethod()).toEqual(granted);
    expect(await methods?.requestMethod()).toEqual(granted);
    expect(asked).toEqual(['get', 'request']);
  });
});
