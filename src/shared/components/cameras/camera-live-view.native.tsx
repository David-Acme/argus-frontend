import { ArgusCameraView, type ArgusCameraViewMethods } from 'argus-camera';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { callback } from 'react-native-nitro-modules';

import type { ICameraMediaSession, ICameraMediaSink } from '@/core/interfaces';
import { cameraMediaService } from '@/core/services/camera-media.service';
import type { CameraStreamQuality } from '@/core/types';

type CameraLiveViewProps = {
  cameraId: string;
  quality?: CameraStreamQuality;
};

/** Live view: native decoder fed by the gateway /camera-stream socket. */
export function CameraLiveView({
  cameraId,
  quality = 'sub',
}: CameraLiveViewProps) {
  const [player, setPlayer] = useState<ArgusCameraViewMethods | null>(null);

  const bindPlayer = useCallback((ref: ArgusCameraViewMethods) => {
    setPlayer(ref);
  }, []);

  useEffect(() => {
    const numericId = Number(cameraId);
    if (!player || !Number.isFinite(numericId) || numericId <= 0) return;

    const sink: ICameraMediaSink = {
      resetStream: () => player.resetStream(),
      pushFragment: (type, keyframe, data) =>
        player.pushFragment(type, keyframe, data),
      bufferedBytes: () => player.bufferedBytes(),
    };

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
      session?.close();
    };
  }, [cameraId, player, quality]);

  return (
    <View className="bg-card overflow-hidden rounded-2xl">
      <ArgusCameraView
        hybridRef={callback(bindPlayer)}
        active
        style={{ width: '100%', aspectRatio: 16 / 9 }}
      />
    </View>
  );
}
