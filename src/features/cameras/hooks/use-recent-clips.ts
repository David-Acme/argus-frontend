import type {
  ICameraCacheRow,
  ICameraClip,
  ICameraClips,
  IServiceResponse,
} from '@/core/interfaces';
import type { ResourceMatch } from '@/core/types';
import { viewCacheService } from '@/core/services/view-cache.service';
import { clipRowsOf, clipSourceIds, newestClips } from '@/features/cameras/model/camera-clips';
import { cameraClipsService } from '@/features/cameras/services/camera-clips.service';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource, type RemoteResourceStatus } from '@/shared/hooks/use-remote-resource';

export type RecentClips = { clips: readonly ICameraClip[]; status: RemoteResourceStatus };

const RECENT_SCOPE = 'recent';

const CLIPS_PER_CAMERA = 2;

const RECENT_CLIPS: readonly ResourceMatch[] = [{ domain: 'camera', scope: 'clips' }];

async function loadRecentClips(): Promise<IServiceResponse<ICameraClips>> {
  const cameras = viewCacheService.read<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const pages = await Promise.all(
    clipSourceIds(cameras).map((id) => cameraClipsService.list(id, undefined, CLIPS_PER_CAMERA))
  );
  const read = pages.filter((page) => page.ok && page.info);
  const failed = pages.length > 0 && read.length === 0;
  return {
    status: failed ? (pages[0]?.status ?? 0) : 200,
    ok: !failed,
    info: { cameraId: 0, clips: read.flatMap((page) => page.info?.clips ?? []) },
    errors: failed ? (pages[0]?.errors ?? null) : null,
  };
}

export function useRecentClips(limit: number, enabled: boolean): RecentClips {
  const resource = useRemoteResource<ICameraClips>({
    cacheKey: VIEW_CACHE_KEYS.cameraClips,
    scope: RECENT_SCOPE,
    load: loadRecentClips,
    enabled,
    resources: RECENT_CLIPS,
  });
  return { clips: newestClips(clipRowsOf(resource.data), limit), status: resource.status };
}
