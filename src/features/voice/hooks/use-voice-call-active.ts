import { useSyncExternalStore } from 'react';
import { voiceService } from '@/features/voice/services/voice';

const subscribe = (listener: () => void): (() => void) => voiceService.subscribe(listener);

const getActive = (): boolean => voiceService.isActive;

export function useVoiceCallActive(): boolean {
  return useSyncExternalStore(subscribe, getActive, getActive);
}
