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
  keyguard: { overKeyguard: boolean; keyguardLocked: boolean },
): string | null {
  if (!lockedId || pathname === '/call') return null;
  if (!keyguard.overKeyguard || !keyguard.keyguardLocked) return null;
  return `/call?callId=${encodeURIComponent(lockedId)}&outside=1`;
}
