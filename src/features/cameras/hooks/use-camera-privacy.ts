import type { ICameraCacheRow } from '@/core/interfaces';
import type { CameraPrivacyState } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';

export function useCameraPrivacy(cameraId: string | number): CameraPrivacyState {
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const camera = cameras.find((row) => row.id === String(cameraId));
  return camera?.privacyState ?? 'unknown';
}
