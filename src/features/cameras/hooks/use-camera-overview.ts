import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import type { ICameraOverview } from '@/core/interfaces';
import { CAMERA_OVERVIEW_REFRESH_MS } from '@/features/cameras/constants';
import { cameraControlService } from '@/features/cameras/services/camera-control.service';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';

const loadOverview = () => cameraControlService.overview();

export function useCameraOverview(): ICameraOverview | null {
  const { data, reload } = useRemoteResource<ICameraOverview>({
    cacheKey: VIEW_CACHE_KEYS.cameraOverview,
    load: loadOverview,
  });

  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(() => void reload(), CAMERA_OVERVIEW_REFRESH_MS);
      return () => clearInterval(timer);
    }, [reload]),
  );

  return data;
}
