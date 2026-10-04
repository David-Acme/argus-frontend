import { useCallback, useState } from 'react';
import { storageService } from '@/core/services/storage';
import { useVoiceCallActive } from '@/features/voice';
import {
  LIVE_AUDIO_STORAGE_KEY,
  liveAudioLevel,
  liveAudioReason,
  storedMuted,
  type LiveAudioReason,
} from '@/features/cameras/model/camera-live-audio';

export type CameraLiveAudio = {
  muted: boolean;
  level: number;
  reason: LiveAudioReason;
  blocked: boolean;
  unlockKey: number;
  toggle: () => void;
  unlock: () => void;
  setBlocked: (blocked: boolean) => void;
};

export function useCameraLiveAudio(cameraCall: boolean): CameraLiveAudio {
  const argusCall = useVoiceCallActive();
  const [muted, setMuted] = useState(() => storedMuted(storageService.getBoolean(LIVE_AUDIO_STORAGE_KEY)));
  const [blocked, setBlocked] = useState(false);
  const [unlockKey, setUnlockKey] = useState(0);
  const context = { muted, argusCall, cameraCall };

  const unlock = useCallback(() => setUnlockKey((key) => key + 1), []);

  const toggle = useCallback(() => {
    const next = blocked ? false : !muted;
    storageService.set(LIVE_AUDIO_STORAGE_KEY, next);
    setMuted(next);
    if (!next) setUnlockKey((key) => key + 1);
  }, [blocked, muted]);

  return {
    muted,
    level: liveAudioLevel(context),
    reason: liveAudioReason(context),
    blocked,
    unlockKey,
    toggle,
    unlock,
    setBlocked,
  };
}
