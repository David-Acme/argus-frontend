import { useEffect, useEffectEvent, useId, useRef, useState, useSyncExternalStore } from 'react';
import type { View } from 'react-native';
import { useScreenActive } from '@/shared/hooks/use-screen-active';
import { useEffects, useWindowHeight, useWindowWidth } from '@/shared/theme';
import {
  PREVIEW_LIVE_CAP,
  PREVIEW_VIEWPORT_MS,
} from '@/features/cameras/constants/preview.constant';
import { inViewport } from '@/features/cameras/model/camera-preview';
import { previewBoard } from '@/features/cameras/services/preview-board';

export type CameraPreviewWish = { cameraId: string; order: number };

type Box = [number, number, number, number];

export function useCameraPreview({ cameraId, order }: CameraPreviewWish) {
  const active = useScreenActive();
  const { perfTier } = useEffects();
  const key = useId();
  const frame = useRef<View | null>(null);
  const [visible, setVisible] = useState(false);
  const width = useWindowWidth();
  const height = useWindowHeight();
  const granted = useSyncExternalStore(previewBoard.subscribe, () => previewBoard.isGranted(key));
  const probe = useEffectEvent(() =>
    frame.current?.measureInWindow((...[x, y, boxWidth, boxHeight]: Box) =>
      setVisible(inViewport({ x, y, width: boxWidth, height: boxHeight }, { width, height }))
    )
  );

  useEffect(() => {
    previewBoard.setCap(PREVIEW_LIVE_CAP[perfTier ?? 'low']);
  }, [perfTier]);

  useEffect(() => {
    if (!active) return;
    probe();
    const timer = setInterval(probe, PREVIEW_VIEWPORT_MS);
    return () => clearInterval(timer);
  }, [active]);

  useEffect(() => {
    previewBoard.wish({ key, cameraId, order, visible: active && visible });
  }, [active, cameraId, key, order, visible]);

  useEffect(() => () => previewBoard.forget(key), [key]);

  return { frame, live: granted && active };
}
