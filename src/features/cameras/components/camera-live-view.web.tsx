import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type { ICameraMediaSession, ICameraMediaSink } from '@/core/interfaces';
import type { CameraStreamQuality, CameraStreamState } from '@/core/types';
import { cameraMediaService } from '@/features/cameras/services/camera-media.service';
import { CAMERA_LIVE_BACKGROUND } from '@/features/cameras/constants';
import { CameraLiveStatus } from '@/features/cameras/components/camera-live-status';
import { WebCameraPlayer } from '@/features/cameras/components/web-camera-player';
import { cn } from '@/shared/libs/utils';

type CameraLiveViewProps = {
  cameraId: string;
  quality?: CameraStreamQuality;
  overlay?: ReactNode;
  fill?: boolean;
  className?: string;
};

type StreamStatus = {
  key: string;
  state: CameraStreamState;
  painted: boolean;
};

const CANVAS_STYLE = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  background: CAMERA_LIVE_BACKGROUND,
  display: 'block',
} as const;

export function CameraLiveView({ cameraId, quality = 'sub', overlay, fill = false, className }: CameraLiveViewProps) {
  const focused = useIsFocused();
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const session = useRef<ICameraMediaSession | null>(null);
  const [unsupported, setUnsupported] = useState(() => !WebCameraPlayer.supported);
  const [status, setStatus] = useState<StreamStatus | null>(null);
  const streamKey = `${cameraId}:${quality}`;
  const current = status?.key === streamKey ? status : null;

  const retry = useCallback(() => session.current?.retry(), []);

  useEffect(() => {
    if (unsupported || !focused) return;
    const target = canvas.current;
    const numericId = Number(cameraId);
    if (!target || !Number.isFinite(numericId) || numericId <= 0) return;

    const update = (next: Partial<Omit<StreamStatus, 'key'>>) =>
      setStatus((previous) => ({
        key: streamKey,
        state: previous?.key === streamKey ? previous.state : 'connecting',
        painted: previous?.key === streamKey ? previous.painted : false,
        ...next,
      }));
    const player = new WebCameraPlayer(target, {
      onFirstFrame: () => update({ painted: true }),
      onUnsupported: () => setUnsupported(true),
    });
    const sink: ICameraMediaSink = {
      resetStream: () => player.reset(),
      pushFragment: (type, _keyframe, data) => player.push(type, data),
      bufferedBytes: () => player.buffered(),
    };

    const onVisibility = () => player.setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    onVisibility();

    let mounted = true;
    void cameraMediaService
      .open({
        cameraId: numericId,
        quality,
        fastStart: true,
        sink,
        events: { onState: (state) => update({ state }) },
      })
      .then((opened) => {
        if (mounted) session.current = opened;
        else opened.close();
      });

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', onVisibility);
      session.current?.close();
      session.current = null;
      player.dispose();
    };
  }, [cameraId, focused, quality, streamKey, unsupported]);

  return (
    <View
      testID={`camera-live-${cameraId}`}
      className={cn('overflow-hidden rounded-2xl', fill ? 'absolute inset-0' : 'w-full', className)}
      style={fill ? undefined : { aspectRatio: 16 / 9, backgroundColor: CAMERA_LIVE_BACKGROUND }}>
      {unsupported ? null : <canvas ref={canvas} style={CANVAS_STYLE} />}
      {overlay}
      <CameraLiveStatus
        state={unsupported ? 'unsupported' : (current?.state ?? 'connecting')}
        painted={current?.painted ?? false}
        onRetry={retry}
      />
    </View>
  );
}
