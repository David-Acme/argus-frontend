import type { ICameraOverview } from '@/core/interfaces';
import type { ResourceMatch } from '@/core/types';
import { cameraControlService } from '@/features/cameras/services/camera-control.service';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';

const loadOverview = () => cameraControlService.overview();

const CAMERA_OVERVIEW: readonly ResourceMatch[] = [{ domain: 'camera', scope: 'overview' }];

export function useCameraOverview(enabled = true): ICameraOverview | null {
  const { data } = useRemoteResource<ICameraOverview>({
    cacheKey: VIEW_CACHE_KEYS.cameraOverview,
    load: loadOverview,
    enabled,
    resources: CAMERA_OVERVIEW,
  });

  return data;
}
