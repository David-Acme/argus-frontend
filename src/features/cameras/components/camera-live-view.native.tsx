import { ArgusCameraView, type ArgusCameraViewMethods } from 'argus-camera';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { callback } from 'react-native-nitro-modules';
import type { ICameraLiveSession, ICameraMediaSink, ICameraLiveStats } from '@/core/interfaces';
import type {
  CameraRtcStream,
  CameraStreamQuality,
  CameraStreamState,
  CameraTransport,
} from '@/core/types';
import { cameraLiveService } from '@/features/cameras/services/camera-live.service';
import { CAMERA_LIVE_BACKGROUND } from '@/features/cameras/constants';
import { CameraLiveStatus } from '@/features/cameras/components/camera-live-status';
import { CameraRtcVideo } from './camera-rtc-video';
import { cn } from '@/shared/libs/utils';

type CameraLiveStreamProps = {
  cameraId: string;
  active: boolean;
  quality?: CameraStreamQuality;
  overlay?: ReactNode;
  fill?: boolean;
  compactStatus?: boolean;
  className?: string;
  onStats?: (stats: ICameraLiveStats) => void;
  onState?: (state: CameraStreamState) => void;
  audioLevel?: number;
  audioUnlock?: number;
  onAudioBlocked?: (blocked: boolean) => void;
};

type CameraLiveViewProps = Omit<CameraLiveStreamProps, 'active'>;

type StreamStatus = {
  key: string;
  state: CameraStreamState;
  painted: boolean;
  transport: CameraTransport | null;
  rtcStream: CameraRtcStream | null;
};

export function CameraLiveView(props: CameraLiveViewProps) {
  const focused = useIsFocused();
  return <CameraLiveStream {...props} active={focused} />;
}

export function CameraLiveStream({
  cameraId,
  active,
  quality = 'sub',
  overlay,
  fill = false,
  compactStatus,
  className,
  onStats,
  onState,
  audioLevel = 0,
}: CameraLiveStreamProps) {
  const [player, setPlayer] = useState<ArgusCameraViewMethods | null>(null);
  const session = useRef<ICameraLiveSession | null>(null);
  const [status, setStatus] = useState<StreamStatus | null>(null);
  const streamKey = `${cameraId}:${quality}`;
  const current = status?.key === streamKey ? status : null;
  const showRtc = current?.transport === 'webrtc';

  const bindPlayer = useCallback((ref: ArgusCameraViewMethods) => {
    setPlayer(ref);
  }, []);

  const retry = useCallback(() => session.current?.retry(), []);
  const reportStats = useEffectEvent((stats: ICameraLiveStats) => onStats?.(stats));
  const reportState = useEffectEvent((state: CameraStreamState) => onState?.(state));
  const currentLevel = useEffectEvent(() => audioLevel);

  useEffect(() => {
    const numericId = Number(cameraId);
    if (!player || !active || !Number.isFinite(numericId) || numericId <= 0) return;

    const update = (next: Partial<Omit<StreamStatus, 'key'>>) =>
      setStatus((previous) => {
        const same = previous?.key === streamKey;
        return {
          key: streamKey,
          state: same ? previous.state : 'connecting',
          painted: same ? previous.painted : false,
          transport: same ? previous.transport : null,
          rtcStream: same ? previous.rtcStream : null,
          ...next,
        };
      });
    const sink: ICameraMediaSink = {
      resetStream: () => player.resetStream(),
      pushFragment: (type, keyframe, data) => player.pushFragment(type, keyframe, data),
      bufferedBytes: () => player.bufferedBytes(),
    };

    const opened = cameraLiveService.open({
      cameraId: numericId,
      quality,
      sink,
      events: {
        onState: (state) => {
          setStatus((previous) => {
            const same = previous?.key === streamKey;
            return {
              key: streamKey,
              state,
              painted: state === 'live' || (same && previous.painted),
              transport: same ? previous.transport : null,
              rtcStream: same ? previous.rtcStream : null,
            };
          });
          reportState(state);
        },
        onStats: (stats) => reportStats(stats),
        onTransport: (transport) => update({ transport }),
        onRtcStream: (stream) => update({ rtcStream: stream }),
      },
    });
    opened.setAudioEnabled(currentLevel() > 0);
    session.current = opened;

    return () => {
      opened.close();
      session.current = null;
    };
  }, [active, cameraId, player, quality, streamKey]);

  useEffect(() => {
    session.current?.setAudioEnabled(audioLevel > 0);
  }, [audioLevel]);

  return (
    <View
      className={cn('overflow-hidden rounded-2xl', fill ? 'absolute inset-0' : 'w-full', className)}
      style={fill ? undefined : { aspectRatio: 16 / 9, backgroundColor: CAMERA_LIVE_BACKGROUND }}>
      <ArgusCameraView
        hybridRef={callback(bindPlayer)}
        active={active}
        muted={audioLevel <= 0 || showRtc}
        style={{ width: '100%', height: '100%', opacity: showRtc ? 0 : 1 }}
      />
      <CameraRtcVideo stream={current?.rtcStream ?? null} visible={showRtc} />
      {overlay}
      <CameraLiveStatus
        state={current?.state ?? 'connecting'}
        painted={current?.painted ?? false}
        compact={compactStatus ?? fill}
        onRetry={retry}
      />
    </View>
  );
}
