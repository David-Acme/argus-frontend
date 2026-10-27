import type { VoiceStartOptions } from '@/core/types';
import { CALL_BACK_PURPOSE } from '@/shared/libs/call-back';

export type CallParams = { callId?: string; purpose?: string; reminderId?: string };

export function callStartOf({ callId, purpose, reminderId }: CallParams): VoiceStartOptions {
  if (callId) return { callId };
  const id = Number(reminderId);
  if (purpose !== CALL_BACK_PURPOSE || !Number.isSafeInteger(id) || id <= 0) return {};
  return { purpose: CALL_BACK_PURPOSE, reminderId: id };
}
