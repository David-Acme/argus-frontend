import { ArgusCameraView } from 'argus-camera';
import type { ArgusCameraViewMethods } from 'argus-camera';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { callback } from 'react-native-nitro-modules';
import type {
  CameraLiveTransportPolicy,
  ICameraLiveSession,
  ICameraMediaSink,
  ICameraLiveStats,
} from '@/core/interfaces';
import type {
  CameraLiveNotice,
  CameraRtcStream,
  CameraStreamQuality,
  CameraStreamState,
  CameraTransport,
} from '@/core/types';
import { cn } from '@/shared/libs/utils';
import { cameraLiveService } from '@/features/cameras/services/camera-live.service';
import { CAMERA_LIVE_BACKGROUND } from '@/features/cameras/constants';
import { nativePlayerMuted } from '@/features/cameras/model/camera-live-audio';
import { CameraLiveStatus } from '@/features/cameras/components/camera-live-status';
import { CameraPrivacyPlaceholder } from '@/features/cameras/components/camera-privacy-placeholder';
import { CameraRtcVideo } from '@/features/cameras/components/camera-rtc-video';
import type { LiveViewStatus } from '@/features/cameras/model/camera-stage';

type CameraLiveStreamProps = {
  cameraId: string;
  active: boolean;
  quality?: CameraStreamQuality;
  transport?: CameraLiveTransportPolicy;
  isolatedBackoff?: boolean;
  privacy?: boolean;
  overlay?: ReactNode;
  fill?: boolean;
  compactStatus?: boolean;
  className?: string;
  onStats?: (stats: ICameraLiveStats) => void;
  onState?: (state: CameraStreamState) => void;
  statusHidden?: boolean;
  statusInsets?: EdgeInsets;
  audioLevel?: number;
  audioUnlock?: number;
  onAudioBlocked?: (blocked: boolean) => void;
  onStatus?: (status: LiveViewStatus) => void;
};

type CameraLiveViewProps = Omit<CameraLiveStreamProps, 'active'>;

type StreamStatus = {
  key: string;
  state: CameraStreamState;
  painted: boolean;
  transport: CameraTransport | null;
  rtcStream: CameraRtcStream | null;
  notice: CameraLiveNotice | null;
};

export function CameraLiveView(props: CameraLiveViewProps) {
  const focused = useIsFocused();
  return <CameraLiveStream {...props} active={focused} />;
}

export function CameraLiveStream({
  cameraId,
  active,
  quality = 'sub',
  transport = 'auto',
  isolatedBackoff = false,
  privacy = false,
  overlay,
  fill = false,
  compactStatus,
  className,
  onStats,
  onState,
  statusHidden,
  statusInsets,
  audioLevel = 0,
  onStatus,
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
  const reportStatus = useEffectEvent((next: LiveViewStatus) => onStatus?.(next));
  const currentLevel = useEffectEvent(() => audioLevel);

  useEffect(() => {
    const numericId = Number(cameraId);
    if (privacy || !player || !active || !Number.isFinite(numericId) || numericId <= 0) return;

    const update = (next: Partial<Omit<StreamStatus, 'key'>>) =>
      setStatus((previous) => {
        const same = previous?.key === streamKey;
        return {
          key: streamKey,
          state: same ? previous.state : 'connecting',
          painted: same ? previous.painted : false,
          transport: same ? previous.transport : null,
          rtcStream: same ? previous.rtcStream : null,
          notice: same ? previous.notice : null,
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
      transport,
      isolatedBackoff,
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
              notice: same ? previous.notice : null,
            };
          });
          reportState(state);
        },
        onStats: (stats) => reportStats(stats),
        onTransport: (transport) => update({ transport }),
        onRtcStream: (stream) => update({ rtcStream: stream }),
        onNotice: (notice) => update({ notice }),
      },
    });
    opened.setAudioEnabled(currentLevel() > 0);
    session.current = opened;

    return () => {
      opened.close();
      session.current = null;
    };
  }, [active, cameraId, player, privacy, quality, streamKey, transport, isolatedBackoff]);

  const shownState = current?.state ?? 'connecting';
  const shownPainted = current?.painted ?? false;
  const shownNotice = current?.notice ?? null;

  useEffect(() => {
    reportStatus({ state: shownState, painted: shownPainted, notice: shownNotice, retry });
  }, [retry, shownNotice, shownPainted, shownState]);

  useEffect(() => {
    session.current?.setAudioEnabled(audioLevel > 0);
  }, [audioLevel]);

  return (
    <View
      className={cn('overflow-hidden rounded-2xl', fill ? 'absolute inset-0' : 'w-full', className)}
      style={fill ? undefined : { aspectRatio: 16 / 9, backgroundColor: CAMERA_LIVE_BACKGROUND }}>
      {privacy ? (
        <CameraPrivacyPlaceholder fill />
      ) : (
        <>
          <ArgusCameraView
            hybridRef={callback(bindPlayer)}
            active={active}
            muted={nativePlayerMuted({ level: audioLevel, transport: current?.transport ?? null })}
            style={{ width: '100%', height: '100%', opacity: showRtc ? 0 : 1 }}
          />
          <CameraRtcVideo stream={current?.rtcStream ?? null} visible={showRtc} />
          {overlay}
          {onStatus ? null : (
            <CameraLiveStatus
              state={shownState}
              painted={shownPainted}
              notice={shownNotice}
              compact={compactStatus ?? fill}
              hidden={statusHidden}
              insets={statusInsets}
              onRetry={retry}
            />
          )}
        </>
      )}
    </View>
  );
}
