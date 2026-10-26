import { useEffect, useRef } from 'react';
import type { ICameraCacheRow, ICameraCapabilities, ICameraDeviceStatus } from '@/core/interfaces';
import { cameraControlService } from '@/features/cameras/services/camera-control.service';
import { resolveCapabilities } from '@/features/cameras/model/camera-capabilities';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';

export type CameraFeatures = {
  features: ICameraCapabilities | null;
  device: ICameraDeviceStatus | null;
  deviceFailed: boolean;
  reloadDevice: () => Promise<void>;
  applyDevice: (status: ICameraDeviceStatus | null) => void;
};

function signatureOf(camera: ICameraCacheRow | null): string {
  if (!camera) return '';
  return [
    camera.driver,
    camera.ip,
    camera.port,
    camera.catalogId,
    camera.model,
    ...camera.capabilities,
  ].join('|');
}

export function useCameraFeatures(id: string, camera: ICameraCacheRow | null): CameraFeatures {
  const deviceResource = useRemoteResource({
    cacheKey: VIEW_CACHE_KEYS.cameraDevice,
    scope: id,
    load: () => cameraControlService.status(id),
    resources: [{ domain: 'camera', scope: 'status', id: Number(id) }],
  });
  const featureResource = useRemoteResource<ICameraCapabilities>({
    cacheKey: VIEW_CACHE_KEYS.cameraCapabilities,
    scope: id,
    load: () => cameraControlService.capabilities(id),
  });
  const signature = signatureOf(camera);
  const seen = useRef(signature);
  const reloadFeatures = featureResource.reload;
  const reloadDevice = deviceResource.reload;
  const mutateDevice = deviceResource.mutate;

  useEffect(() => {
    if (seen.current === signature) return;
    seen.current = signature;
    void reloadFeatures();
    void reloadDevice();
  }, [signature, reloadDevice, reloadFeatures]);

  return {
    features: resolveCapabilities(camera?.capabilities ?? [], featureResource.data),
    device: deviceResource.data,
    deviceFailed: deviceResource.status === 'failed',
    reloadDevice,
    applyDevice: (status) => mutateDevice(() => status),
  };
}
