import { useEffect, useRef, useState } from 'react';
import type { FlightAction } from '@/shared/ui/button';

export type ConfirmLatch = { once: (action: FlightAction) => () => void; busy: boolean };

export function useConfirmLatch(open: boolean): ConfirmLatch {
  const latched = useRef(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) latched.current = false;
  }, [open]);
  const once = (action: FlightAction) => () => {
    if (latched.current) return;
    latched.current = true;
    const result = action();
    if (!(result instanceof Promise)) return;
    setBusy(true);
    result
      .catch(() => undefined)
      .finally(() => {
        latched.current = false;
        setBusy(false);
      });
  };
  return { once, busy };
}
