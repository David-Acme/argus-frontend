import { ArgusCameraView } from 'argus-camera';
import type { ArgusCameraViewMethods } from 'argus-camera';
import { useState } from 'react';
import { View } from 'react-native';
import { callback } from 'react-native-nitro-modules';
import { useCameraPreview } from '@/features/cameras/hooks/use-camera-preview';
import { usePreviewStream } from '@/features/cameras/hooks/use-preview-stream';

export type CameraPreviewProps = { cameraId: string; order: number };

const SHOWN = { width: '100%', height: '100%', opacity: 1 } as const;

const HIDDEN = { ...SHOWN, opacity: 0 } as const;

function PreviewPlayer({ cameraId, order }: CameraPreviewProps) {
  const [player, setPlayer] = useState<ArgusCameraViewMethods | null>(null);
  const { shown } = usePreviewStream({
    cameraId,
    order,
    fastStart: false,
    ready: player !== null,
    open: () => (player ? { sink: player, dispose: () => player.resetStream() } : null),
  });
  return (
    <ArgusCameraView hybridRef={callback(setPlayer)} active muted style={shown ? SHOWN : HIDDEN} />
  );
}

export function CameraPreview({ cameraId, order }: CameraPreviewProps) {
  const { frame, live } = useCameraPreview({ cameraId, order });
  return (
    <View ref={frame} className="pointer-events-none absolute inset-0">
      {live ? <PreviewPlayer cameraId={cameraId} order={order} /> : null}
    </View>
  );
}
