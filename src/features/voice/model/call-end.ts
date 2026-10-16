import type { CallEndReason } from '@/core/types';

export type CallEndAction = 'show-ended' | 'close-now';

export type IncomingCancelReason = 'answered_elsewhere' | 'expired' | 'resolved' | 'declined' | 'attended';

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
  handlers: { showEnded: () => void; closeNow: () => void },
): void {
  if (callEndAction(reason) === 'show-ended') handlers.showEnded();
  else handlers.closeNow();
}

export function formatCallDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
