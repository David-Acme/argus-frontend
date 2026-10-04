import { useCallback, useRef, useState } from 'react';
import type { CameraStreamQuality, CameraStreamState } from '@/core/types';
import { storageService } from '@/core/services/storage';
import { IS_NATIVE } from '@/shared/constants';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import {
  defaultQuality,
  isStall,
  QUALITY_STORAGE_PREFIX,
  recordStall,
  shouldFallBack,
  storedQuality,
  type StallHistory,
} from '@/features/cameras/model/camera-stream-quality';

export type CameraQualityControls = {
  quality: CameraStreamQuality;
  fellBack: boolean;
  choose: (quality: CameraStreamQuality) => void;
  restore: () => void;
  observe: (state: CameraStreamState) => void;
};

export function useCameraQuality(cameraId: string): CameraQualityControls {
  const { isWide } = useWindowClass();
  const storageKey = `${QUALITY_STORAGE_PREFIX}${cameraId}`;
  const [chosen, setChosen] = useState<CameraStreamQuality | null>(() =>
    storedQuality(storageService.getString(storageKey)),
  );
  const [fellBack, setFellBack] = useState(false);
  const previous = useRef<CameraStreamState | null>(null);
  const stalls = useRef<StallHistory>([]);
  const preferred = chosen ?? defaultQuality({ wide: isWide, native: IS_NATIVE });
  const quality: CameraStreamQuality = fellBack ? 'sub' : preferred;

  const choose = useCallback(
    (next: CameraStreamQuality) => {
      storageService.set(storageKey, next);
      setChosen(next);
      setFellBack(false);
      stalls.current = [];
    },
    [storageKey],
  );

  const restore = useCallback(() => {
    setFellBack(false);
    stalls.current = [];
  }, []);

  const observe = useCallback(
    (state: CameraStreamState) => {
      const stalled = isStall(previous.current, state);
      previous.current = state;
      if (!stalled) return;
      stalls.current = recordStall(stalls.current, Date.now());
      if (shouldFallBack(quality, stalls.current)) setFellBack(true);
    },
    [quality],
  );

  return { quality, fellBack, choose, restore, observe };
}
