import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import type { ICameraCacheRow } from '@/core/interfaces';
import { isPendingRecordId } from '@/shared/libs/optimistic';
import { CameraThumbnailPoller } from '@/features/cameras/services/camera-thumbnail.service';

const NO_THUMBNAILS: ReadonlyMap<string, string> = new Map();

export function useCameraThumbnails(cameras: readonly ICameraCacheRow[]): ReadonlyMap<string, string> {
  const focused = useIsFocused();
  const [thumbnails, setThumbnails] = useState<ReadonlyMap<string, string>>(NO_THUMBNAILS);
  const watched = cameras
    .filter((camera) => camera.isEnabled && camera.isOnline && !isPendingRecordId(camera.id))
    .map((camera) => camera.id)
    .join(',');

  useEffect(() => {
    if (!focused || watched === '') return;
    const poller = new CameraThumbnailPoller(watched.split(','), setThumbnails);
    poller.start();
    return () => poller.stop();
  }, [focused, watched]);

  return thumbnails;
}
