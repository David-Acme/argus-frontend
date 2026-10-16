import { useEffect } from 'react';
import { pushService } from '@/core/services/push';

export function usePushListeners(): void {
  useEffect(() => {
    pushService.bindListeners();
  }, []);
}
