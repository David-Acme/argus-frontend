import { useCallback, useRef, useState } from 'react';
import type { ICameraClip } from '@/core/interfaces';
import type { PlayerSource } from '@/shared/ui/media';
import { clipImageUri, isImageClip } from '@/features/cameras/model/camera-clips';
import { clipPlayerSource } from '@/features/cameras/model/clip-index';
import { cameraClipsService } from '@/features/cameras/services/camera-clips.service';

export type ClipPlaybackState = 'idle' | 'loading' | 'ready' | 'failed' | 'unsupported';

export type ClipPlayback = {
  state: ClipPlaybackState;
  clip: ICameraClip | null;
  media: PlayerSource | null;
  image: string | null;
  open: (clip: ICameraClip) => void;
  close: () => void;
};

export function useClipPlayback(cameraId: string): ClipPlayback {
  const [state, setState] = useState<ClipPlaybackState>('idle');
  const [clip, setClip] = useState<ICameraClip | null>(null);
  const [media, setMedia] = useState<PlayerSource | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const run = useRef(0);

  const open = useCallback(
    (next: ICameraClip) => {
      const current = run.current + 1;
      run.current = current;
      setClip(next);
      setMedia(null);
      setImage(null);
      setState('loading');
      void (async () => {
        const preview = await cameraClipsService.preview(cameraId, next.id);
        if (current !== run.current) return;
        const content =
          preview.ok && preview.info ? await cameraClipsService.content(preview.info.token) : null;
        if (current !== run.current) return;
        if (!content?.ok || !content.info) {
          setState('failed');
          return;
        }
        if (isImageClip(next)) {
          setImage(clipImageUri(content.info.mimeType || next.contentType, content.info.base64));
          setState('ready');
          return;
        }
        const source = clipPlayerSource(`clip:${cameraId}:${next.id}`, content.info.base64);
        setMedia(source);
        setState(source ? 'ready' : 'unsupported');
      })();
    },
    [cameraId]
  );

  const close = useCallback(() => {
    run.current += 1;
    setMedia(null);
    setImage(null);
    setClip(null);
    setState('idle');
  }, []);

  return { state, clip, media, image, open, close };
}
