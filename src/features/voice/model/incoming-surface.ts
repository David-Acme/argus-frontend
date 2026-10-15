export const CALL_SCREEN_PATH = '/call';

export function incomingSurfaceVisible(waiting: { callId: string } | null, pathname: string): boolean {
  return waiting !== null && pathname !== CALL_SCREEN_PATH;
}

export function isCriticalRing(urgency: string | undefined): boolean {
  return urgency === 'critical';
}
