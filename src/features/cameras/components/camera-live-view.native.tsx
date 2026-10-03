import { ArgusCameraView, type ArgusCameraViewMethods } from 'argus-camera';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { callback } from 'react-native-nitro-modules';
import type { ICameraMediaSession, ICameraMediaSink } from '@/core/interfaces';
import type { CameraStreamQuality, CameraStreamState } from '@/core/types';
import { cameraMediaService } from '@/features/cameras/services/camera-media.service';
import { CAMERA_LIVE_BACKGROUND } from '@/features/cameras/constants';
import { CameraLiveStatus } from '@/features/cameras/components/camera-live-status';
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

export function CameraLiveView({ cameraId, quality = 'sub', overlay, fill = false, className }: CameraLiveViewProps) {
  const focused = useIsFocused();
  const [player, setPlayer] = useState<ArgusCameraViewMethods | null>(null);
  const session = useRef<ICameraMediaSession | null>(null);
  const [status, setStatus] = useState<StreamStatus | null>(null);
  const streamKey = `${cameraId}:${quality}`;
  const current = status?.key === streamKey ? status : null;

  const bindPlayer = useCallback((ref: ArgusCameraViewMethods) => {
    setPlayer(ref);
  }, []);

  const retry = useCallback(() => session.current?.retry(), []);

  useEffect(() => {
    const numericId = Number(cameraId);
    if (!player || !focused || !Number.isFinite(numericId) || numericId <= 0) return;

    const sink: ICameraMediaSink = {
      resetStream: () => player.resetStream(),
      pushFragment: (type, keyframe, data) => player.pushFragment(type, keyframe, data),
      bufferedBytes: () => player.bufferedBytes(),
    };

    let mounted = true;
    void cameraMediaService
      .open({
        cameraId: numericId,
        quality,
        sink,
        events: {
          onState: (state) =>
            setStatus((previous) => ({
              key: streamKey,
              state,
              painted: state === 'live' || (previous?.key === streamKey && previous.painted),
            })),
        },
      })
      .then((opened) => {
        if (mounted) session.current = opened;
        else opened.close();
      });

    return () => {
      mounted = false;
      session.current?.close();
      session.current = null;
    };
  }, [cameraId, focused, player, quality, streamKey]);

  return (
    <View
      className={cn('overflow-hidden rounded-2xl', fill ? 'absolute inset-0' : 'w-full', className)}
      style={fill ? undefined : { aspectRatio: 16 / 9, backgroundColor: CAMERA_LIVE_BACKGROUND }}>
      <ArgusCameraView
        hybridRef={callback(bindPlayer)}
        active={focused}
        style={{ width: '100%', height: '100%' }}
      />
      {overlay}
      <CameraLiveStatus
        state={current?.state ?? 'connecting'}
        painted={current?.painted ?? false}
        onRetry={retry}
      />
    </View>
  );
}
