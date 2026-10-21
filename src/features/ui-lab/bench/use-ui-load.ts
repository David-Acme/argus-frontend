import { useEffect } from 'react';
import { useFrameCallback } from 'react-native-reanimated';

export function useUiLoad(milliseconds: number): void {
  const load = useFrameCallback(() => {
    'worklet';
    const until = performance.now() + milliseconds;
    while (performance.now() < until);
  }, false);
  useEffect(() => {
    load.setActive(milliseconds > 0);
  }, [load, milliseconds]);
}
