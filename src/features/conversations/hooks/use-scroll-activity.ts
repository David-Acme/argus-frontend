import { useCallback, useEffect, useRef, useState } from 'react';

export type ScrollActivity = { scrolling: boolean; touch: () => void };

export function useScrollActivity(holdMs: number): ScrollActivity {
  const [scrolling, setScrolling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const touch = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setScrolling(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setScrolling(false);
    }, holdMs);
  }, [holdMs]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return { scrolling, touch };
}
