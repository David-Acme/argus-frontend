import { useEffect, useSyncExternalStore } from 'react';
import { netService } from '@/core/services/net';
import type { NetRouteStatus } from '@/core/types';
import { toastServiceError } from '@/shared/libs/service-error';

const subscribe = (onChange: () => void): (() => void) => netService.onRouteChoice(onChange);

const status = (): NetRouteStatus | null => netService.routeChoice()?.status ?? null;

const relayRefused = (): boolean => netService.routeChoice()?.relayRefused ?? false;

export function useRouteStatus(): NetRouteStatus | null {
  return useSyncExternalStore(subscribe, status, status);
}

export function useRelayRefusalAlert(): void {
  const refused = useSyncExternalStore(subscribe, relayRefused, relayRefused);
  useEffect(() => {
    if (refused) toastServiceError({ code: 'FINGERPRINT_MISMATCH', message: '' });
  }, [refused]);
}
