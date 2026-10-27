import type { ICameraClip } from '@/core/interfaces';
import type { ResourceMatch } from '@/core/types';
import { useInfiniteList, useRemoteFeed } from '@/shared/hooks/use-infinite-list';
import { CLIP_FEED_PAGE, clipFeedScope } from '@/features/cameras/model/camera-clips';
import { clipFeed } from '@/features/cameras/services/camera-clips.service';

const CLIPS: readonly ResourceMatch[] = [{ domain: 'camera', scope: 'clips' }];

export type ClipFeed = ReturnType<typeof useClipFeed>;

export function useClipFeed(cameraId: string | null, enabled: boolean) {
  const feed = useRemoteFeed(clipFeed, clipFeedScope(cameraId), enabled, CLIPS);
  const paging = useInfiniteList({
    count: feed.rows.length,
    hasMore: feed.hasMore,
    loadMore: feed.loadMore,
    endAfter: CLIP_FEED_PAGE,
  });
  const forget = (clip: ICameraClip) =>
    clipFeed.mutateAll((rows) => rows.filter((row) => row.id !== clip.id));
  return { ...feed, paging, forget };
}
