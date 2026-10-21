import { useEffect } from 'react';
import { useFrameCallback } from 'react-native-reanimated';

const LOAD_DELAY_MS = 6000;

export function useUiLoad(milliseconds: number): void {
  const load = useFrameCallback(() => {
    'worklet';
    const until = performance.now() + milliseconds;
    while (performance.now() < until);
  }, false);
  useEffect(() => {
    if (milliseconds <= 0) return;
    const timer = setTimeout(() => load.setActive(true), LOAD_DELAY_MS);
    return () => {
      clearTimeout(timer);
      load.setActive(false);
    };
  }, [load, milliseconds]);
}
