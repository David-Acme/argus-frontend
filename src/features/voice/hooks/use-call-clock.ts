import { useEffect, useState } from 'react';
import { CALL_CLOCK_TICK_MS } from '@/features/voice/constants/call.constant';

export function useCallClock(since: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (since === null) return;
    const timer = setInterval(() => setNow(Date.now()), CALL_CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, [since]);

  return since === null ? 0 : Math.max(0, now - since);
}
