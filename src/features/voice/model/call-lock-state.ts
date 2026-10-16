import { pushService } from '@/core/services/push';
import { traceEvent } from '@/core/services/native-trace';
import { callLockedId, callLockRedirect, callLockTraceReason, outsideCallIdFrom } from './call-lock';

export function outsideCallLockId(): string | null {
  return outsideCallIdFrom(pushService.outsideCallId(), callLockedId());
}

export function currentCallLockRedirect(pathname: string): string | null {
  const lockedId = outsideCallLockId();
  const keyguard = {
    overKeyguard: pushService.overKeyguard(),
    keyguardLocked: pushService.isKeyguardLocked(),
  };
  const href = callLockRedirect(pathname, lockedId, keyguard);
  traceEvent(
    'lock',
    href ? 'redirect' : 'stay',
    callLockTraceReason({
      onCall: pathname === '/call',
      held: lockedId !== null,
      over: keyguard.overKeyguard,
      locked: keyguard.keyguardLocked,
    }),
  );
  return href;
}
