import type { RtcDeclineAnswer } from '@/core/types';

export type DeclineSender = (callId: string) => Promise<RtcDeclineAnswer | null>;

export function declineOncePerSession(post: (callId: string) => Promise<RtcDeclineAnswer>): DeclineSender {
  const sent = new Set<string>();
  return async (callId) => {
    if (sent.has(callId)) return null;
    sent.add(callId);
    return post(callId);
  };
}
