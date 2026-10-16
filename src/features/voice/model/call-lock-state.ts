import { pushService } from '@/core/services/push';
import { useAuthStore } from '@/core/stores';
import { traceEvent } from '@/core/services/native-trace';
import { callLockedId, callLockTraceReason, decideCallLock, outsideCallIdFrom } from './call-lock';

export function outsideCallLockId(): string | null {
  return outsideCallIdFrom(pushService.outsideCallId(), callLockedId());
}

let tracedDecision: string | null = null;

export function currentCallLockRedirect(pathname: string): string | null {
  const lockedId = outsideCallLockId();
  const keyguard = {
    overKeyguard: pushService.overKeyguard(),
    keyguardLocked: pushService.isKeyguardLocked(),
    signedIn: useAuthStore.getState().status === 'signed-in',
  };
  const decision = decideCallLock({ pathname, lockedId, ...keyguard });
  const flags = callLockTraceReason({
    onCall: pathname === '/call',
    held: lockedId !== null,
    over: keyguard.overKeyguard,
    locked: keyguard.keyguardLocked,
  });
  const key = `${decision.reason}-${flags}`;
  if (key !== tracedDecision) {
    tracedDecision = key;
    traceEvent('lock', decision.reason === 'leave' ? 'left' : decision.href ? 'redirect' : 'stay', flags);
  }
  if (decision.reason === 'leave') pushService.sendToBackground();
  return decision.href;
}
