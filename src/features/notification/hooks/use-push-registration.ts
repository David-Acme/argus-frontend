import { useEffect } from 'react';
import { pushService } from '@/core/services/push';

export function usePushRegistration(): void {
  useEffect(() => {
    void pushService.register();
  }, []);
}
