import { useEffect, useEffectEvent, useRef } from 'react';
import type { PlayerStatus } from './player-model';
import type { SurfaceHandle, VideoSurfaceProps } from './video-surface-types';

const VIDEO_STYLE = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'contain',
} as const;

const toMs = (seconds: number): number => (Number.isFinite(seconds) ? seconds * 1000 : 0);

function handleOf(video: HTMLVideoElement): SurfaceHandle {
  return {
    play: () => {
      if (video.ended) video.currentTime = 0;
      void video.play().catch(() => undefined);
    },
    pause: () => video.pause(),
    seekTo: (positionMs) => {
      video.currentTime = positionMs / 1000;
    },
    setRate: (rate) => {
      video.playbackRate = rate;
    },
    reclaim: () => undefined,
    positionMs: () => toMs(video.currentTime),
    durationMs: () => toMs(video.duration),
    bufferedMs: () =>
      video.buffered.length > 0 ? toMs(video.buffered.end(video.buffered.length - 1)) : 0,
  };
}

function statusOf(video: HTMLVideoElement): PlayerStatus {
  if (video.error) return 'error';
  if (video.ended) return 'ended';
  if (video.readyState < 3) return 'loading';
  return video.paused ? 'ready' : 'playing';
}

const WATCHED = ['playing', 'pause', 'waiting', 'canplay', 'ended', 'error', 'seeked'] as const;

export function VideoSurface({ source, autoPlay, muted, events }: VideoSurfaceProps) {
  const video = useRef<HTMLVideoElement | null>(null);
  const ready = useEffectEvent(events.onReady);
  const status = useEffectEvent(events.onStatus);
  const painted = useEffectEvent(events.onFirstFrame);

  useEffect(() => {
    const element = video.current;
    if (!element) return undefined;
    const url = URL.createObjectURL(new Blob([source.data], { type: 'video/mp4' }));
    element.src = url;
    const report = () => status(statusOf(element));
    const first = () => painted();
    for (const name of WATCHED) element.addEventListener(name, report);
    element.addEventListener('loadeddata', first);
    ready(handleOf(element));
    if (autoPlay) void element.play().catch(report);
    return () => {
      for (const name of WATCHED) element.removeEventListener(name, report);
      element.removeEventListener('loadeddata', first);
      element.removeAttribute('src');
      element.load();
      URL.revokeObjectURL(url);
    };
  }, [autoPlay, source]);

  return <video ref={video} playsInline muted={muted} style={VIDEO_STYLE} />;
}
