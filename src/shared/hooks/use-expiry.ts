import { useEffect, useState } from 'react';

export function useExpiry(active: boolean, delayMs: number): boolean {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setExpired(true), delayMs);
    return () => {
      clearTimeout(timer);
      setExpired(false);
    };
  }, [active, delayMs]);

  return active && expired;
}
