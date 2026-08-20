import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { voiceService } from '@/core/services/voice';
import type { VoicePhase } from '@/core/types';

export type VoiceSessionState = {
  phase: VoicePhase;
  isActive: boolean;
  sttText: string;
  assistantText: string;
  error: string | null;
};

let cached: VoiceSessionState | null = null;

const subscribe = (listener: () => void): (() => void) => voiceService.subscribe(listener);

const getSnapshot = (): VoiceSessionState => {
  const next: VoiceSessionState = {
    phase: voiceService.phaseValue,
    isActive: voiceService.isActive,
    sttText: voiceService.sttTextValue,
    assistantText: voiceService.assistantTextValue,
    error: voiceService.errorValue,
  };
  if (
    cached &&
    cached.phase === next.phase &&
    cached.isActive === next.isActive &&
    cached.sttText === next.sttText &&
    cached.assistantText === next.assistantText &&
    cached.error === next.error
  ) {
    return cached;
  }
  cached = next;
  return cached;
};

/** Reactive voice session state (avatar + transcript + errors). */
export function useVoiceSession() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const start = useCallback(() => {
    void voiceService.start();
  }, []);

  const stop = useCallback(() => {
    voiceService.stop();
  }, []);

  const skip = useCallback(() => {
    voiceService.skip();
  }, []);

  const answer = useCallback((text: string) => {
    voiceService.answer(text);
  }, []);

  // Stable object identity: `state` is cached by getSnapshot and the callbacks
  // are useCallback-stable, so consumers can safely use this in effect deps.
  return useMemo(
    () => ({ ...state, start, stop, skip, answer }),
    [state, start, stop, skip, answer],
  );
}