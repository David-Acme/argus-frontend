import { voiceService } from '@/features/voice/services/voice/voice.service';

export function isVoiceCallActive(): boolean {
  return voiceService.isActive;
}
