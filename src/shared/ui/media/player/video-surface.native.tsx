import { ArgusCameraView, type ArgusCameraViewMethods } from 'argus-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { callback } from 'react-native-nitro-modules';
import { statusOf, type SurfaceHandle, type VideoSurfaceProps } from './video-surface-types';

function handleOf(view: ArgusCameraViewMethods, key: string): SurfaceHandle {
  return {
    play: () => view.play(),
    pause: () => view.pause(),
    seekTo: (positionMs) => view.seekTo(positionMs),
    setRate: (rate) => view.setRate(rate),
    reclaim: () => void view.adoptMedia(key),
    positionMs: () => view.mediaPositionMs(),
    durationMs: () => view.mediaDurationMs(),
    bufferedMs: () => view.mediaBufferedMs(),
  };
}

export function VideoSurface({
  source,
  adopt = false,
  autoPlay,
  muted,
  events,
}: VideoSurfaceProps) {
  const [view, setView] = useState<ArgusCameraViewMethods | null>(null);
  const latest = useRef(events);
  const bind = useCallback((ref: ArgusCameraViewMethods) => {
    setView((bound) => bound ?? ref);
  }, []);

  useEffect(() => {
    latest.current = events;
  });

  useEffect(() => {
    if (!view) return undefined;
    if (!adopt || !view.adoptMedia(source.key)) view.loadMedia(source.data, source.key);
    latest.current.onReady(handleOf(view, source.key));
    return () => view.releaseMedia(source.key);
  }, [adopt, source, view]);

  return (
    <ArgusCameraView
      hybridRef={callback(bind)}
      active={autoPlay}
      muted={muted}
      fill={false}
      onMediaState={callback((state: string) => events.onStatus(statusOf(state)))}
      onFirstFrame={callback(() => events.onFirstFrame())}
      onAudioFailed={callback(() => events.onAudioFailed())}
      style={StyleSheet.absoluteFill}
    />
  );
}
