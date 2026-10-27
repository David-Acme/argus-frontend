import { useRef } from 'react';
import { View } from 'react-native';
import { useCameraPreview } from '@/features/cameras/hooks/use-camera-preview';
import { usePreviewStream } from '@/features/cameras/hooks/use-preview-stream';
import { WebCameraPlayer } from '@/features/cameras/components/web-camera-player';

export type CameraPreviewProps = { cameraId: string; order: number };

const CANVAS = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
} as const;

function PreviewCanvas({ cameraId, order }: CameraPreviewProps) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  usePreviewStream({
    cameraId,
    order,
    fastStart: true,
    ready: WebCameraPlayer.supported,
    open: () => {
      const target = canvas.current;
      if (!target) return null;
      const player = new WebCameraPlayer(target);
      return {
        sink: {
          resetStream: () => player.reset(),
          pushFragment: (type, _keyframe, data) => player.push(type, data),
          bufferedBytes: () => player.buffered(),
        },
        dispose: () => player.dispose(),
      };
    },
  });
  return <canvas ref={canvas} style={CANVAS} />;
}

export function CameraPreview({ cameraId, order }: CameraPreviewProps) {
  const { frame, live } = useCameraPreview({ cameraId, order });
  return (
    <View ref={frame} className="pointer-events-none absolute inset-0">
      {live ? <PreviewCanvas cameraId={cameraId} order={order} /> : null}
    </View>
  );
}
