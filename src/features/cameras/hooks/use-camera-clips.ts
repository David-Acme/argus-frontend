import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ICameraClip, ICameraClips } from '@/core/interfaces';
import type { ResourceMatch } from '@/core/types';
import {
  CLIP_PAGE_SIZE,
  clipRowsOf,
  mergeClipPages,
  olderClipCursor,
} from '@/features/cameras/model/camera-clips';
import { cameraClipsService } from '@/features/cameras/services/camera-clips.service';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource, type RemoteResourceStatus } from '@/shared/hooks/use-remote-resource';

export type CameraClipsState = {
  clips: readonly ICameraClip[];
  status: RemoteResourceStatus;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  forget: (clip: ICameraClip) => void;
  reload: () => Promise<void>;
};

export function useCameraClips(cameraId: string, enabled: boolean): CameraClipsState {
  const load = useCallback(() => cameraClipsService.list(cameraId), [cameraId]);
  const resources = useMemo<readonly ResourceMatch[]>(
    () => [{ domain: 'camera', scope: 'clips', id: Number(cameraId) }],
    [cameraId],
  );
  const resource = useRemoteResource<ICameraClips>({
    cacheKey: VIEW_CACHE_KEYS.cameraClips,
    scope: cameraId,
    load,
    enabled,
    resources,
  });
  const first = useMemo(() => clipRowsOf(resource.data), [resource.data]);
  const [older, setOlder] = useState<readonly ICameraClip[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const newest = first[0]?.id ?? '';
  const seen = useRef(newest);

  useEffect(() => {
    if (seen.current === newest) return;
    seen.current = newest;
    setOlder([]);
  }, [newest]);

  const mutate = resource.mutate;
  const clips = useMemo(() => mergeClipPages(first, older), [first, older]);
  const hasMore = first.length >= CLIP_PAGE_SIZE && !moreFailed;

  const loadMore = useCallback(() => {
    const cursor = olderClipCursor(older.length > 0 ? older : first);
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    void cameraClipsService
      .list(cameraId, cursor)
      .then((result) => {
        if (!result.ok) {
          setMoreFailed(true);
          return;
        }
        setOlder((previous) => mergeClipPages(previous, clipRowsOf(result.info)));
      })
      .finally(() => setLoadingMore(false));
  }, [cameraId, first, older, loadingMore]);

  const forget = useCallback(
    (clip: ICameraClip) => {
      setOlder((previous) => previous.filter((row) => row.id !== clip.id));
      mutate((previous) =>
        previous
          ? { ...previous, clips: previous.clips.filter((row) => String(row.id) !== clip.id) }
          : previous,
      );
    },
    [mutate],
  );

  return {
    clips,
    status: resource.status,
    hasMore,
    loadingMore,
    loadMore,
    forget,
    reload: resource.reload,
  };
}
