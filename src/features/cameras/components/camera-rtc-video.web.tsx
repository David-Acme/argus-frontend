import { useEffect, useRef } from 'react';
import type { CameraRtcStream } from '@/core/types';
import { CAMERA_LIVE_BACKGROUND } from '@/features/cameras/constants';

type CameraRtcVideoProps = {
  stream: CameraRtcStream | null;
  visible: boolean;
};

const VIDEO_STYLE = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  background: CAMERA_LIVE_BACKGROUND,
} as const;

export function CameraRtcVideo({ stream, visible }: CameraRtcVideoProps) {
  const video = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const media = stream instanceof MediaStream ? stream : null;
    if (element.srcObject !== media) element.srcObject = media;
    if (media) void element.play().catch(() => undefined);
  }, [stream]);

  return (
    <video
      ref={video}
      autoPlay
      playsInline
      muted
      style={{ ...VIDEO_STYLE, opacity: visible ? 1 : 0 }}
    />
  );
}
