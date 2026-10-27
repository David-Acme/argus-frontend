import { readTypingFrame } from '@/core/contracts/conversation.contract';
import { synchronizeService } from '@/core/services/sync';
import { SYNC_OPERATION } from '@/shared/constants';
import {
  TYPING_SEND_TYPE,
  VOICE_DONE_FRAME,
  VOICE_TEXT_DONE_FRAME,
} from '@/features/conversations/constants/typing.constant';
import { TypingTracker } from '@/features/conversations/services/typing/typing-tracker';

export const typingTracker = new TypingTracker({
  now: () => Date.now(),
  schedule: (run, ms) => {
    const timer = setTimeout(run, ms);
    return () => clearTimeout(timer);
  },
});

let bound = false;

export function bindTyping(): void {
  if (bound) return;
  bound = true;
  synchronizeService.on(SYNC_OPERATION.Typing, (message) => {
    const frame = readTypingFrame(message.info);
    if (frame) typingTracker.apply(frame);
  });
  synchronizeService.onType(VOICE_TEXT_DONE_FRAME, () => typingTracker.stop());
  synchronizeService.onType(VOICE_DONE_FRAME, () => typingTracker.stop());
  synchronizeService.onDisconnect(() => typingTracker.clear());
}

export function sendTyping(counterpartId: number, active: boolean): void {
  synchronizeService.send(TYPING_SEND_TYPE, { counterpartId, active });
}
