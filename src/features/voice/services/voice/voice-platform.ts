import { rtcCallSupported } from '@/features/voice/services/rtc';
import { createVoiceMic, voiceCallSupported } from './voice-mic';

export { createVoiceMic, voiceCallSupported };

export function argusCallSupported(): boolean {
  return rtcCallSupported() || voiceCallSupported();
}
