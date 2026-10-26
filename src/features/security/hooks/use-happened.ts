import type { ICameraCacheRow } from '@/core/interfaces';
import type { GuardEpisode } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useNow } from '@/shared/hooks/use-now';
import { useMomentFormat } from '@/features/security/hooks/use-moment-format';
import { cameraNameOf, happenedItems, happenedStatus } from '@/features/security/model/happened';

export type HappenedFeed = {
  rows: readonly GuardEpisode[];
  status: 'idle' | 'loading' | 'ready' | 'failed';
};

const MINUTE_MS = 60_000;

export function useHappened(feed: HappenedFeed, limit?: number) {
  const { guard } = useCapabilities();
  const now = useNow(MINUTE_MS);
  const format = useMomentFormat();
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const names = new Map(cameras.map((camera) => [camera.id, camera.name]));
  const items = happenedItems(feed.rows, {
    now,
    format,
    canReview: guard.review,
    cameraName: cameraNameOf(names),
  });
  const shown = limit === undefined ? items : items.slice(0, limit);
  return { items: shown, status: happenedStatus(shown.length, feed.status) };
}
