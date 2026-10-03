import { useCallback, useState } from 'react';
import type { IServiceResponse } from '@/core/interfaces';
import { runServiceAction, type ServiceAction } from '@/shared/libs/service-action';

export function useServiceAction() {
  const [pending, setPending] = useState(false);

  const run = useCallback(async <R,>(action: ServiceAction<R>): Promise<IServiceResponse<R> | null> => {
    setPending(true);
    try {
      return await runServiceAction(action);
    } finally {
      setPending(false);
    }
  }, []);

  return { run, pending };
}
