import { useEffect, useRef } from 'react';
import { PTZ_HOLD_DELAY_MS, type PtzDirection } from '@/features/cameras/model/camera-ptz';
import type { CameraPtzControls } from '@/features/cameras/hooks/use-camera-ptz';

export type PadPress = { onStart: () => void; onEnd: () => void };

export function usePadPress(direction: PtzDirection, ptz: CameraPtzControls): PadPress {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holding = useRef(false);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return {
    onStart: () => {
      holding.current = false;
      timer.current = setTimeout(() => {
        holding.current = true;
        ptz.onHoldStart(direction);
      }, PTZ_HOLD_DELAY_MS);
    },
    onEnd: () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      if (holding.current) ptz.onHoldEnd();
      else ptz.onStep(direction);
      holding.current = false;
    },
  };
}
