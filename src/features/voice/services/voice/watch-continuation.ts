import { voiceService } from '@/features/voice/services/voice/voice.service';
import { rtcCallSupported } from '@/features/voice/services/rtc';

export type WatchContinuationInput = {
  conversationId: string;
  reason: string | null;
};

export function watchContinuationSupported(): boolean {
  return rtcCallSupported();
}

export function continueWatchConversation({ conversationId, reason }: WatchContinuationInput): boolean {
  if (voiceService.isActive || !watchContinuationSupported()) return false;
  void voiceService.start({ watchConversationId: conversationId, reason });
  return true;
}

export function completeWatchHandoff(conversationId: string): void {
  voiceService.completeWatchHandoff(conversationId);
}
