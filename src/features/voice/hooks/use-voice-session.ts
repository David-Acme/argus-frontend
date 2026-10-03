import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { voiceService } from '@/features/voice/services/voice';
import type { VoiceSnapshot } from '@/core/types';

export type VoiceSessionState = VoiceSnapshot;

const subscribe = (listener: () => void): (() => void) => voiceService.subscribe(listener);

const getSnapshot = (): VoiceSessionState => voiceService.snapshot;

export function useVoiceSession() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const start = useCallback(() => {
    void voiceService.start();
  }, []);

  const stop = useCallback(() => {
    voiceService.stop();
  }, []);

  const interrupt = useCallback(() => {
    voiceService.interrupt();
  }, []);

  const skip = useCallback(() => {
    voiceService.skip();
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    voiceService.setMuted(muted);
  }, []);

  const answer = useCallback((text: string) => {
    voiceService.answer(text);
  }, []);

  return useMemo(
    () => ({ ...state, start, stop, interrupt, skip, setMuted, answer }),
    [state, start, stop, interrupt, skip, setMuted, answer],
  );
}
