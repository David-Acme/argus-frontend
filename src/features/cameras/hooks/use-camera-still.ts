import { useEffect, useState } from 'react';
import {
  lastCameraFrames,
  rememberCameraFrame,
} from '@/features/cameras/services/camera-frame-cache';
import { cameraControlService } from '@/features/cameras/services/camera-control.service';

export function useCameraStill(cameraId: string | null): string | null {
  const [frame, setFrame] = useState<string | null>(() =>
    cameraId ? (lastCameraFrames([cameraId]).get(cameraId) ?? null) : null
  );

  useEffect(() => {
    if (!cameraId || frame) return;
    let active = true;
    void cameraControlService.snapshot(cameraId).then((result) => {
      if (!active || !result.ok || !result.info?.image) return;
      rememberCameraFrame(cameraId, result.info.image);
      setFrame(result.info.image);
    });
    return () => {
      active = false;
    };
  }, [cameraId, frame]);

  return frame;
}
