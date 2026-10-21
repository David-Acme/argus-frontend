import { useEffect, useState } from 'react';

const WINDOW_MS = 1000;

export function useJsFps(): number {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let frames = 0;
    let started = performance.now();
    let handle = 0;
    const tick = (now: number) => {
      frames += 1;
      if (now - started >= WINDOW_MS) {
        setFps(Math.round((frames * WINDOW_MS) / (now - started)));
        frames = 0;
        started = now;
      }
      handle = globalThis.requestAnimationFrame(tick);
    };
    handle = globalThis.requestAnimationFrame(tick);
    return () => globalThis.cancelAnimationFrame(handle);
  }, []);
  return fps;
}
