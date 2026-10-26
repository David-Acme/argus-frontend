import type { CallEndReason } from '@/core/types';

export type CallEndAction = 'show-ended' | 'close-now';

export type IncomingCancelReason =
  'answered_elsewhere' | 'expired' | 'resolved' | 'declined' | 'attended';

export const ENDED_HOLD_MS = 2000;

export function callEndAction(reason: CallEndReason): CallEndAction {
  return reason === 'answered-ended' ? 'show-ended' : 'close-now';
}

export function endReasonOfCancel(reason: IncomingCancelReason): CallEndReason {
  if (reason === 'answered_elsewhere') return 'claimed-elsewhere';
  if (reason === 'declined') return 'declined';
  return 'missed';
}

export function dispatchCallEnd(
  reason: CallEndReason,
  handlers: { showEnded: () => void; closeNow: () => void }
): void {
  if (callEndAction(reason) === 'show-ended') handlers.showEnded();
  else handlers.closeNow();
}

export type CancelOutcome = 'ignore' | 'taken' | 'close';

export function cancelOutcomeOf(input: {
  reason: IncomingCancelReason;
  callId: string;
  claimedCallId: string | null;
}): CancelOutcome {
  if (input.reason !== 'answered_elsewhere') return 'close';
  return input.claimedCallId === input.callId ? 'ignore' : 'taken';
}

export function showsMicConsent(input: {
  firstCall: boolean;
  phase: string;
  endedDurationMs: number | null;
}): boolean {
  return (
    input.firstCall &&
    input.phase !== 'done' &&
    input.phase !== 'error' &&
    input.endedDurationMs === null
  );
}
