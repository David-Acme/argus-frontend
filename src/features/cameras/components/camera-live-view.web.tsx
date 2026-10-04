import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type { ICameraMediaSession, ICameraMediaSink, ICameraLiveStats } from '@/core/interfaces';
import type { CameraStreamQuality, CameraStreamState } from '@/core/types';
import { cameraMediaService } from '@/features/cameras/services/camera-media.service';
import { CAMERA_LIVE_BACKGROUND } from '@/features/cameras/constants';
import { CameraLiveStatus } from '@/features/cameras/components/camera-live-status';
import { WebCameraAudio } from '@/features/cameras/components/web-camera-audio';
import { WebCameraPlayer } from '@/features/cameras/components/web-camera-player';
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
};

const CANVAS_STYLE = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  background: CAMERA_LIVE_BACKGROUND,
  display: 'block',
} as const;

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
  audioUnlock = 0,
  onAudioBlocked,
}: CameraLiveStreamProps) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const session = useRef<ICameraMediaSession | null>(null);
  const audio = useRef<WebCameraAudio | null>(null);
  const [unsupported, setUnsupported] = useState(() => !WebCameraPlayer.supported);
  const [status, setStatus] = useState<StreamStatus | null>(null);
  const streamKey = `${cameraId}:${quality}`;
  const current = status?.key === streamKey ? status : null;

  const retry = useCallback(() => session.current?.retry(), []);
  const reportStats = useEffectEvent((stats: ICameraLiveStats) => onStats?.(stats));
  const reportState = useEffectEvent((state: CameraStreamState) => onState?.(state));
  const reportBlocked = useEffectEvent((blocked: boolean) => onAudioBlocked?.(blocked));
  const currentLevel = useEffectEvent(() => audioLevel);

  useEffect(() => {
    if (unsupported || !active) return;
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
    const sound = new WebCameraAudio((blocked) => reportBlocked(blocked));
    sound.setLevel(currentLevel());
    audio.current = sound;
    const sink: ICameraMediaSink = {
      resetStream: () => player.reset(),
      pushFragment: (type, _keyframe, data) => {
        if (type === 1) sound.init(new Uint8Array(data));
        else sound.push(new Uint8Array(data));
        player.push(type, data);
      },
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
        events: {
          onState: (state) => {
            update({ state });
            reportState(state);
          },
          onStats: (stats) => reportStats(stats),
        },
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
      sound.dispose();
      audio.current = null;
      reportBlocked(false);
    };
  }, [active, cameraId, quality, streamKey, unsupported]);

  useEffect(() => {
    audio.current?.setLevel(audioLevel);
  }, [audioLevel]);

  useEffect(() => {
    if (audioUnlock > 0) audio.current?.unlock();
  }, [audioUnlock]);

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
        compact={compactStatus ?? fill}
        onRetry={retry}
      />
    </View>
  );
}
