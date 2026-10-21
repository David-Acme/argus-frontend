import { useEffect } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

const LEVEL_HZ = 30;

export function useSimulatedLevel(enabled: boolean): SharedValue<number> | undefined {
  const level = useSharedValue(0);
  useEffect(() => {
    if (!enabled) return;
    const started = performance.now();
    const handle = globalThis.setInterval(() => {
      const t = (performance.now() - started) / 1000;
      level.set(
        Math.abs(Math.sin(t * 6.1) * Math.sin(t * 2.3 + 1)) * (0.6 + 0.4 * Math.sin(t * 1.1))
      );
    }, 1000 / LEVEL_HZ);
    return () => globalThis.clearInterval(handle);
  }, [enabled, level]);
  return enabled ? level : undefined;
}
