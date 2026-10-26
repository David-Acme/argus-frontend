import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
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
import { cameraRtcService } from '@/features/cameras/services/camera-rtc';
import { CAMERA_LIVE_BACKGROUND } from '@/features/cameras/constants';
import { CameraLiveStatus } from '@/features/cameras/components/camera-live-status';
import { CameraPrivacyPlaceholder } from '@/features/cameras/components/camera-privacy-placeholder';
import { CameraRtcVideo } from './camera-rtc-video';
import { WebCameraAudio } from '@/features/cameras/components/web-camera-audio';
import { WebCameraPlayer } from '@/features/cameras/components/web-camera-player';
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

const CANVAS_STYLE = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  background: CAMERA_LIVE_BACKGROUND,
  display: 'block',
} as const;

function playableHere(): boolean {
  return WebCameraPlayer.supported || cameraRtcService.supported();
}

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
  audioUnlock = 0,
  onAudioBlocked,
  onStatus,
}: CameraLiveStreamProps) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const session = useRef<ICameraLiveSession | null>(null);
  const audio = useRef<WebCameraAudio | null>(null);
  const [unsupported, setUnsupported] = useState(() => !playableHere());
  const [status, setStatus] = useState<StreamStatus | null>(null);
  const streamKey = `${cameraId}:${quality}`;
  const current = status?.key === streamKey ? status : null;
  const showRtc = current?.transport === 'webrtc';

  const retry = useCallback(() => session.current?.retry(), []);
  const reportStats = useEffectEvent((stats: ICameraLiveStats) => onStats?.(stats));
  const reportState = useEffectEvent((state: CameraStreamState) => onState?.(state));
  const reportStatus = useEffectEvent((next: LiveViewStatus) => onStatus?.(next));
  const reportBlocked = useEffectEvent((blocked: boolean) => onAudioBlocked?.(blocked));
  const currentLevel = useEffectEvent(() => audioLevel);

  useEffect(() => {
    if (unsupported || !active || privacy) return;
    const target = canvas.current;
    const numericId = Number(cameraId);
    if (!target || !Number.isFinite(numericId) || numericId <= 0) return;

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
    const player = WebCameraPlayer.supported
      ? new WebCameraPlayer(target, {
          onFirstFrame: () => update({ painted: true }),
          onUnsupported: () => setUnsupported(true),
        })
      : null;
    const sound = new WebCameraAudio((blocked) => reportBlocked(blocked));
    sound.setLevel(currentLevel());
    audio.current = sound;
    const sink: ICameraMediaSink = {
      resetStream: () => player?.reset(),
      pushFragment: (type, _keyframe, data) => {
        if (type === 1) sound.init(new Uint8Array(data));
        else sound.push(new Uint8Array(data));
        player?.push(type, data);
      },
      bufferedBytes: () => player?.buffered() ?? 0,
    };

    const onVisibility = () => player?.setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    onVisibility();

    const opened = cameraLiveService.open({
      cameraId: numericId,
      quality,
      transport,
      isolatedBackoff,
      fastStart: true,
      sink,
      events: {
        onState: (state) => {
          update({ state });
          reportState(state);
        },
        onStats: (stats) => reportStats(stats),
        onTransport: (transport) => {
          if (transport === 'ws' && !player) {
            setUnsupported(true);
            return;
          }
          if (transport === 'webrtc') update({ transport, painted: true });
          else update({ transport, painted: false });
        },
        onRtcStream: (stream) => {
          sound.attachStream(stream instanceof MediaStream ? stream : null);
          update({ rtcStream: stream });
        },
        onNotice: (notice) => update({ notice }),
      },
    });
    opened.setAudioEnabled(currentLevel() > 0);
    session.current = opened;

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      opened.close();
      session.current = null;
      player?.dispose();
      sound.dispose();
      audio.current = null;
      reportBlocked(false);
    };
  }, [active, cameraId, privacy, quality, streamKey, transport, isolatedBackoff, unsupported]);

  const shownState = unsupported ? 'unsupported' : (current?.state ?? 'connecting');
  const shownPainted = current?.painted ?? false;
  const shownNotice = current?.notice ?? null;

  useEffect(() => {
    reportStatus({ state: shownState, painted: shownPainted, notice: shownNotice, retry });
  }, [retry, shownNotice, shownPainted, shownState]);

  useEffect(() => {
    audio.current?.setLevel(audioLevel);
    session.current?.setAudioEnabled(audioLevel > 0);
  }, [audioLevel]);

  useEffect(() => {
    if (audioUnlock > 0) audio.current?.unlock();
  }, [audioUnlock]);

  return (
    <View
      testID={`camera-live-${cameraId}`}
      className={cn('overflow-hidden rounded-2xl', fill ? 'absolute inset-0' : 'w-full', className)}
      style={fill ? undefined : { aspectRatio: 16 / 9, backgroundColor: CAMERA_LIVE_BACKGROUND }}>
      {privacy ? (
        <CameraPrivacyPlaceholder fill />
      ) : (
        <>
          {unsupported ? null : (
            <canvas
              ref={canvas}
              style={{ ...CANVAS_STYLE, visibility: showRtc ? 'hidden' : 'visible' }}
            />
          )}
          {unsupported ? null : (
            <CameraRtcVideo stream={current?.rtcStream ?? null} visible={showRtc} />
          )}
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
