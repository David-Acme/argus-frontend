import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { voiceService } from '@/features/voice/services/voice';
import type { VoiceSnapshot, VoiceStartOptions } from '@/core/types';

export type VoiceSessionState = VoiceSnapshot;

const subscribe = (listener: () => void): (() => void) => voiceService.subscribe(listener);

const getSnapshot = (): VoiceSessionState => voiceService.snapshot;

export function useVoiceSession() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const start = useCallback((options: VoiceStartOptions = {}) => {
    void voiceService.start(options);
  }, []);

  const stop = useCallback(() => {
    voiceService.stop();
  }, []);

  const skip = useCallback(() => {
    voiceService.skip();
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    voiceService.setMuted(muted);
  }, []);

  return useMemo(
    () => ({ ...state, start, stop, skip, setMuted }),
    [state, start, stop, skip, setMuted]
  );
}
