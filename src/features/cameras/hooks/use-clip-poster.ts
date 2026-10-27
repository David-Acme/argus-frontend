import { useEffect, useSyncExternalStore } from 'react';
import { clipPosters, type ClipPosterKey } from '@/features/cameras/services/clip-poster.service';

export function useClipPoster({ id, cameraId }: ClipPosterKey): string | null {
  const poster = useSyncExternalStore(clipPosters.subscribe, () => clipPosters.poster(id));
  useEffect(() => {
    clipPosters.request({ id, cameraId });
  }, [cameraId, id]);
  return poster;
}
