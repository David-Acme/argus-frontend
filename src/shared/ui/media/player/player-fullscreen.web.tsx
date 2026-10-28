import { useEffect, useEffectEvent, type ReactNode } from 'react';
import {
  enterWindowFullscreen,
  exitWindowFullscreen,
  onWindowFullscreenExit,
} from '@/shared/libs/window-fullscreen';

export type PlayerFullscreenProps = { open: boolean; onExit: () => void; children: ReactNode };

export const FULLSCREEN_ADOPTS = false;

export function PlayerFullscreen({ open, onExit }: PlayerFullscreenProps) {
  const exit = useEffectEvent(onExit);
  useEffect(() => {
    if (!open) return undefined;
    void enterWindowFullscreen();
    const stop = onWindowFullscreenExit(() => exit());
    return () => {
      stop();
      void exitWindowFullscreen();
    };
  }, [open]);
  return null;
}
