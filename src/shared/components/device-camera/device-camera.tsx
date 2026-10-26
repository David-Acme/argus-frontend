import { createPermissionHook } from 'expo';
import type { CameraView as ExpoCameraView, CameraViewProps } from 'expo-camera';
import { lazy, Suspense, type Ref } from 'react';

const loadCamera = () => import('@/shared/components/device-camera/expo-camera');

const LoadedCameraView = lazy(async () => ({ default: (await loadCamera()).CameraView }));

type DeviceCameraProps = CameraViewProps & { ref?: Ref<ExpoCameraView> };

export function DeviceCamera(props: DeviceCameraProps) {
  return (
    <Suspense fallback={null}>
      <LoadedCameraView {...props} />
    </Suspense>
  );
}

export const useCameraPermissions = createPermissionHook({
  getMethod: async () => (await loadCamera()).Camera.getCameraPermissionsAsync(),
  requestMethod: async () => (await loadCamera()).Camera.requestCameraPermissionsAsync(),
});
