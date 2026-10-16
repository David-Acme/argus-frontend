import { pushService } from '@/core/services/push';
import { callLockedId, callLockRedirect } from './call-lock';

export function currentCallLockRedirect(pathname: string): string | null {
  return callLockRedirect(pathname, callLockedId(), {
    overKeyguard: pushService.overKeyguard(),
    keyguardLocked: pushService.isKeyguardLocked(),
  });
}
