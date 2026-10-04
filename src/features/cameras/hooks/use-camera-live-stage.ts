import { useCallback, useState } from 'react';
import type { ICameraLiveStats } from '@/core/interfaces';
import type { CameraStreamState } from '@/core/types';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import type { CameraQualityControls } from '@/features/cameras/hooks/use-camera-quality';

export type CameraLiveStageState = {
  fullscreen: boolean;
  showPad: boolean;
  stats: ICameraLiveStats | null;
  live: boolean;
  setFullscreen: (fullscreen: boolean) => void;
  setShowPad: (show: boolean) => void;
  handleStats: (stats: ICameraLiveStats) => void;
  handleState: (state: CameraStreamState) => void;
};

type LiveStageInput = {
  quality: CameraQualityControls;
  onStats: (stats: ICameraLiveStats) => void;
};

export function useCameraLiveStage({ quality, onStats }: LiveStageInput): CameraLiveStageState {
  const { isCompact } = useWindowClass();
  const [fullscreen, setFullscreen] = useState(false);
  const [showPad, setShowPad] = useState(() => !isCompact);
  const [stats, setStats] = useState<ICameraLiveStats | null>(null);
  const [live, setLive] = useState(false);
  const observe = quality.observe;

  const handleStats = useCallback(
    (next: ICameraLiveStats) => {
      setStats(next);
      onStats(next);
    },
    [onStats],
  );

  const handleState = useCallback(
    (state: CameraStreamState) => {
      setLive(state === 'live' || state === 'reconnecting');
      observe(state);
    },
    [observe],
  );

  return { fullscreen, showPad, stats, live, setFullscreen, setShowPad, handleStats, handleState };
}
