import { useMemo } from 'react';
import type { ICameraCacheRow, IZoneCacheRow } from '@/core/interfaces';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import {
  CAMERA_LENSES,
  ZONE_LENSES,
  byCameraName,
  withZones,
} from '@/features/cameras/model/camera-optimistic';

export type CameraRows = {
  cameras: readonly ICameraCacheRow[];
  isPendingCamera: (camera: ICameraCacheRow) => boolean;
  isPendingZone: (zone: IZoneCacheRow) => boolean;
};

export function useCameraRows(): CameraRows {
  const cached = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const { rows: cameraRows, isPending: isPendingCamera } = useOptimisticRows(
    cached,
    CAMERA_LENSES,
    byCameraName,
  );
  const zones = useMemo(() => cameraRows.flatMap((camera) => camera.zones), [cameraRows]);
  const { rows: liveZones, isPending: isPendingZone } = useOptimisticRows(zones, ZONE_LENSES);
  const cameras = useMemo(() => withZones(cameraRows, liveZones), [cameraRows, liveZones]);
  return { cameras, isPendingCamera, isPendingZone };
}
