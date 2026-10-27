import type { ICameraCacheRow } from '@/core/interfaces';
import {
  cameraMasked,
  cameraViews,
  useCameraOverview,
  useCameraThumbnails,
} from '@/features/cameras';
import { useMomentFormat } from '@/features/home/hooks/use-moment-format';
import type { MomentFormat } from '@/features/home/model/camera-moments';
import {
  cameraTiles,
  gridLimit,
  STRIP_CAMERAS,
  type CameraTile,
  type CameraTileSource,
} from '@/features/home/model/camera-tiles';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useNow } from '@/shared/hooks/use-now';
import { useEffects } from '@/shared/theme';

export type CameraSectionForm = { grid: boolean; wide: boolean };

export type CameraSectionData = {
  visible: boolean;
  tiles: readonly CameraTile[];
  frames: ReadonlyMap<string, string>;
  now: number;
  format: MomentFormat;
};

const MINUTE_MS = 60_000;

export function useCameraSection({ grid, wide }: CameraSectionForm): CameraSectionData {
  const { cameraActions } = useCapabilities();
  const { perfTier } = useEffects();
  const now = useNow(MINUTE_MS);
  const format = useMomentFormat();
  const watch = cameraActions.watch;
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const overview = useCameraOverview(watch && cameras.length > 0);
  const sources: CameraTileSource[] = cameraViews(cameras, overview).map((view) => ({
    id: view.camera.id,
    name: view.camera.name,
    status: view.status,
    masked: cameraMasked(view),
    lastEventAt: view.lastEvent?.at ?? null,
  }));
  const tiles = cameraTiles(sources, grid ? gridLimit(wide) : STRIP_CAMERAS);
  const framed = new Set(
    tiles.filter((tile) => tile.state === 'live' || tile.state === 'offline').map((tile) => tile.id)
  );
  const frames = useCameraThumbnails(
    cameras.filter((camera) => watch && framed.has(camera.id)),
    perfTier !== 'low'
  );
  return {
    visible: watch && tiles.length > 0,
    tiles,
    frames,
    now,
    format,
  };
}
