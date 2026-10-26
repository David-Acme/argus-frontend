import type { ICameraCacheRow } from '@/core/interfaces';
import { useRecentClips } from '@/features/cameras';
import { useMomentFormat } from '@/features/home/hooks/use-moment-format';
import type { MomentFormat } from '@/features/home/model/camera-moments';
import { clipTiles, type ClipTile } from '@/features/home/model/camera-tiles';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useNow } from '@/shared/hooks/use-now';

export type RecentClipsData = {
  visible: boolean;
  clips: readonly ClipTile[];
  now: number;
  format: MomentFormat;
};

const MINUTE_MS = 60_000;

const RECENT_CLIPS = 2;

export function useRecentClipTiles(): RecentClipsData {
  const { cameraActions, clips } = useCapabilities();
  const now = useNow(MINUTE_MS);
  const format = useMomentFormat();
  const enabled = cameraActions.watch && clips.view;
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const recent = useRecentClips(RECENT_CLIPS, enabled);
  const tiles = clipTiles(recent.clips, cameras, RECENT_CLIPS);
  return { visible: enabled && tiles.length > 0, clips: tiles, now, format };
}
