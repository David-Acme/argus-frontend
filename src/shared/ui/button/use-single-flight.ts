import { useCallback, useRef, useState } from 'react';

export type FlightAction = () => void | Promise<unknown>;

export function useSingleFlight(action: FlightAction, busy: boolean) {
  const flying = useRef(false);
  const [pending, setPending] = useState(false);
  const run = useCallback(() => {
    if (busy || flying.current) return;
    const result = action();
    if (!(result instanceof Promise)) return;
    flying.current = true;
    setPending(true);
    result
      .catch(() => undefined)
      .finally(() => {
        flying.current = false;
        setPending(false);
      });
  }, [action, busy]);
  return { run, busy: busy || pending };
}
