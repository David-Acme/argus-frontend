import { useCallback, useState } from 'react';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { MASCOT_FRAME_BUDGET } from '@/features/auth/constants/welcome-mascot';

export function useFrameBudget(enabled: boolean): boolean {
  const [strained, setStrained] = useState(false);
  const [probing, setProbing] = useState(true);
  const frames = useSharedValue(0);
  const slow = useSharedValue(0);

  const settle = useCallback((slowShare: number) => {
    setProbing(false);
    if (slowShare > MASCOT_FRAME_BUDGET.slowShare) setStrained(true);
  }, []);

  useFrameCallback((frame) => {
    'worklet';
    const elapsed = frame.timeSincePreviousFrame;
    if (elapsed === null) return;
    frames.value += 1;
    if (frames.value <= MASCOT_FRAME_BUDGET.warmup) return;
    if (elapsed > MASCOT_FRAME_BUDGET.slowMs) slow.value += 1;
    if (frames.value === MASCOT_FRAME_BUDGET.warmup + MASCOT_FRAME_BUDGET.samples) {
      scheduleOnRN(settle, slow.value / MASCOT_FRAME_BUDGET.samples);
    }
  }, enabled && probing);

  return enabled && strained;
}
