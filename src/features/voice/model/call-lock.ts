let lockedCallId: string | null = null;

export function setCallLock(callId: string | null): void {
  lockedCallId = callId;
}

export function callLockedId(): string | null {
  return lockedCallId;
}

export type CallLockInput = {
  pathname: string;
  lockedId: string | null;
  signedIn: boolean;
  overKeyguard: boolean;
  keyguardLocked: boolean;
};

export type CallLockReason = 'signed-out' | 'no-call' | 'leave' | 'on-call' | 'not-locked' | 'redirect';

export type CallLockDecision = { href: string | null; reason: CallLockReason };

export function decideCallLock(input: CallLockInput): CallLockDecision {
  if (!input.signedIn) return { href: null, reason: 'signed-out' };
  const overLockedKeyguard = input.overKeyguard && input.keyguardLocked;
  if (!input.lockedId) return { href: null, reason: overLockedKeyguard ? 'leave' : 'no-call' };
  if (input.pathname === '/call') return { href: null, reason: 'on-call' };
  if (!overLockedKeyguard) return { href: null, reason: 'not-locked' };
  return { href: `/call?callId=${encodeURIComponent(input.lockedId)}&outside=1`, reason: 'redirect' };
}

export function callLockRedirect(
  pathname: string,
  lockedId: string | null,
  keyguard: { overKeyguard: boolean; keyguardLocked: boolean; signedIn: boolean },
): string | null {
  return decideCallLock({ pathname, lockedId, ...keyguard }).href;
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
