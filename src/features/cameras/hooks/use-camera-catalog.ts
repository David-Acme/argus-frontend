import type { ICameraCatalog, ICameraCatalogModel } from '@/core/interfaces';
import { cameraControlService } from '@/features/cameras/services/camera-control.service';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';

const EMPTY: readonly ICameraCatalogModel[] = [];

const loadCatalog = () => cameraControlService.catalog();

export function useCameraCatalog(enabled = true) {
  const resource = useRemoteResource<ICameraCatalog>({
    cacheKey: VIEW_CACHE_KEYS.cameraCatalog,
    load: loadCatalog,
    enabled,
  });
  return {
    models: resource.data?.models ?? EMPTY,
    loading: resource.status === 'loading',
    failed: resource.status === 'failed',
    reload: resource.reload,
  };
}
