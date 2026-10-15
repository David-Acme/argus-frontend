import { useEffect, useRef } from 'react';
import type { AuthStatus } from '@/core/types';
import { useAuthStore } from '@/core/stores';
import { pushService } from '@/core/services/push';
import { registrationDue } from '@/core/services/push/push-registration';

export function usePushRegistration(): void {
  const status = useAuthStore((state) => state.status);
  const previous = useRef<AuthStatus | null>(null);
  useEffect(() => {
    if (registrationDue(previous.current, status)) void pushService.register();
    previous.current = status;
  }, [status]);
}
