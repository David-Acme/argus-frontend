import { useSyncExternalStore } from 'react';
import { voiceService } from '@/features/voice/services/voice';

const subscribe = (listener: () => void): (() => void) => voiceService.subscribe(listener);

const heardNow = (): string => voiceService.sttTextValue;

export function useVoiceHeard(): string {
  return useSyncExternalStore(subscribe, heardNow, heardNow);
}
