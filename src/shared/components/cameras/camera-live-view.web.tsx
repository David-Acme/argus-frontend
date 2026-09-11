import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import type { ICameraMediaSession, ICameraMediaSink } from '@/core/interfaces';
import { cameraMediaService } from '@/core/services/camera-media.service';
import type { CameraStreamQuality } from '@/core/types';
import { Text } from '@/shared/components/ui/text';
import { CAMERA_LIVE_BACKGROUND } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';

import { WebCameraPlayer } from './web-camera-player';

type CameraLiveViewProps = {
  cameraId: string;
  quality?: CameraStreamQuality;
};

/** Desktop/web live view: WebCodecs decoder painted on a canvas. */
export function CameraLiveView({
  cameraId,
  quality = 'sub',
}: CameraLiveViewProps) {
  const { t } = useTranslation();
  const focused = useIsFocused();
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [unsupported] = useState(() => !WebCameraPlayer.supported);

  useEffect(() => {
    if (unsupported || !focused) return;
    const target = canvas.current;
    if (!target) return;
    const numericId = Number(cameraId);
    if (!Number.isFinite(numericId) || numericId <= 0) return;

    const player = new WebCameraPlayer(target);
    const sink: ICameraMediaSink = {
      resetStream: () => player.reset(),
      pushFragment: (type, _keyframe, data) => player.push(type, data),
      bufferedBytes: () => player.buffered(),
    };

    const onVisibility = () => player.setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    onVisibility();

    let mounted = true;
    let session: ICameraMediaSession | null = null;
    void cameraMediaService
      .open({ cameraId: numericId, quality, sink })
      .then((opened) => {
        if (mounted) session = opened;
        else opened.close();
      });

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', onVisibility);
      session?.close();
      player.dispose();
    };
  }, [cameraId, focused, quality, unsupported]);

  if (unsupported) {
    return (
      <View
        testID={`camera-live-${cameraId}`}
        className="bg-card items-center justify-center rounded-2xl p-6">
        <Text className="text-foreground-secondary text-center text-sm">
          {t('screens.cameras.live-unsupported')}
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-card overflow-hidden rounded-2xl">
      <canvas
        ref={canvas}
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          background: CAMERA_LIVE_BACKGROUND,
          display: 'block',
        }}
      />
    </View>
  );
}
