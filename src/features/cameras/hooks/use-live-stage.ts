import { useState } from 'react';
import type { ICameraLiveStats } from '@/core/interfaces';
import type { CameraStreamState } from '@/core/types';
import {
  useCameraLiveAudio,
  type CameraLiveAudio,
} from '@/features/cameras/hooks/use-camera-live-audio';
import {
  useCameraQuality,
  type CameraQualityControls,
} from '@/features/cameras/hooks/use-camera-quality';
import { CAMERA_FRAGMENT_AUDIO } from '@/features/cameras/constants';
import { liveAudioPlayable } from '@/features/cameras/model/camera-live-audio';
import {
  stageOf,
  type CameraStage,
  type LiveViewStatus,
} from '@/features/cameras/model/camera-stage';

export type LiveStageInput = {
  cameraId: string;
  enabled: boolean;
  masked: boolean;
  online: boolean;
  silenced: boolean;
};

export type LiveStage = {
  stage: CameraStage;
  view: LiveViewStatus | null;
  quality: CameraQualityControls;
  audio: CameraLiveAudio;
  hasAudio: boolean;
  fullscreen: boolean;
  ptzShown: boolean;
  setFullscreen: (next: boolean) => void;
  setPtzShown: (next: boolean) => void;
  onStatus: (status: LiveViewStatus) => void;
  onStats: (stats: ICameraLiveStats) => void;
  onState: (state: CameraStreamState) => void;
};

export function useLiveStage({
  cameraId,
  enabled,
  masked,
  online,
  silenced,
}: LiveStageInput): LiveStage {
  const quality = useCameraQuality(cameraId);
  const audio = useCameraLiveAudio(silenced);
  const [view, setView] = useState<LiveViewStatus | null>(null);
  const [stats, setStats] = useState<ICameraLiveStats | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [ptzShown, setPtzShown] = useState(false);
  const stage = stageOf({ enabled, masked, online, view });
  const hasAudio =
    stats?.audio === true &&
    liveAudioPlayable({ transport: stats.transport, fragmentAudio: CAMERA_FRAGMENT_AUDIO });

  return {
    stage,
    view,
    quality,
    audio,
    hasAudio,
    fullscreen,
    ptzShown: ptzShown && stage.kind === 'live',
    setFullscreen,
    setPtzShown,
    onStatus: setView,
    onStats: setStats,
    onState: quality.observe,
  };
}
