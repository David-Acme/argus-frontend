export type CallEndReason = 'answered-ended' | 'missed' | 'declined' | 'claimed-elsewhere';

export type CallEndAction = 'show-ended' | 'close-now';

export const ENDED_HOLD_MS = 2000;

export function callEndAction(reason: CallEndReason): CallEndAction {
  return reason === 'answered-ended' ? 'show-ended' : 'close-now';
}

export function formatCallDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
