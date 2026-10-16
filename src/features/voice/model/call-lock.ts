let lockedCallId: string | null = null;

export function setCallLock(callId: string | null): void {
  lockedCallId = callId;
}

export function callLockedId(): string | null {
  return lockedCallId;
}

export function callLockRedirect(
  pathname: string,
  lockedId: string | null,
  keyguard: { overKeyguard: boolean; keyguardLocked: boolean; signedIn: boolean },
): string | null {
  if (!lockedId || pathname === '/call') return null;
  if (!keyguard.signedIn) return null;
  if (!keyguard.overKeyguard || !keyguard.keyguardLocked) return null;
  return `/call?callId=${encodeURIComponent(lockedId)}&outside=1`;
}

export function outsideCallIdFrom(nativeId: string, storeId: string | null): string | null {
  if (nativeId !== '') return nativeId;
  return storeId;
}

export function callLockTraceReason(input: { onCall: boolean; held: boolean; over: boolean; locked: boolean }): string {
  const flag = (value: boolean): number => (value ? 1 : 0);
  return [
    `call-${flag(input.onCall)}`,
    `held-${flag(input.held)}`,
    `over-${flag(input.over)}`,
    `locked-${flag(input.locked)}`,
  ].join('-');
}
