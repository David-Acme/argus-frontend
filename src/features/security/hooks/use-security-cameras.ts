import type { ICameraCacheRow } from '@/core/interfaces';
import type { GuardEnvironment } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useNow } from '@/shared/hooks/use-now';
import { useEffects } from '@/shared/theme';
import {
  cameraMasked,
  cameraViews,
  useCameraOverview,
  useCameraThumbnails,
} from '@/features/cameras';
import { useMomentFormat } from '@/features/security/hooks/use-moment-format';
import { securityTiles, type SecurityTile } from '@/features/security/model/camera-tiles';
import { camerasIn } from '@/features/security/model/environments';

export type CameraScope = {
  place: GuardEnvironment | null;
  environments: readonly GuardEnvironment[];
};

export type CameraTiles = ReturnType<typeof useCameraTiles>;

const MINUTE_MS = 60_000;

export function useCameraTiles({ place, environments }: CameraScope) {
  const { cameraActions, can } = useCapabilities();
  const now = useNow(MINUTE_MS);
  const format = useMomentFormat();
  const rows = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const cameras = place ? camerasIn(place, environments, rows) : rows;
  const watch = cameraActions.watch;
  const overview = useCameraOverview(watch && cameras.length > 0);
  const tiles = securityTiles(
    cameraViews(cameras, overview).map((view) => ({
      id: view.camera.id,
      name: view.camera.name,
      status: view.status,
      masked: cameraMasked(view),
      lastEventAt: view.lastEvent?.at ?? null,
    }))
  );
  return {
    visible: watch,
    cameras,
    tiles,
    events: overview?.events ?? [],
    now,
    format,
    canCreate: can('camera', 'create'),
    canTalk: cameraActions.talk,
  };
}

export function useCameraFrames(
  cameras: readonly ICameraCacheRow[],
  shown: readonly SecurityTile[]
): ReadonlyMap<string, string> {
  const { perfTier } = useEffects();
  const framed = new Set(
    shown.filter((tile) => tile.state === 'live' || tile.state === 'offline').map((tile) => tile.id)
  );
  return useCameraThumbnails(
    cameras.filter((camera) => framed.has(camera.id)),
    perfTier !== 'low'
  );
}
