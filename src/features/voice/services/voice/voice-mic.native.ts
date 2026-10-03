import { createMic } from 'argus-mic';
import type { IVoiceMic } from '@/core/interfaces';

export function voiceCallSupported(): boolean {
  return true;
}

export function createVoiceMic(): IVoiceMic {
  return createMic();
}
