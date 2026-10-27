import { useEffect, useRef, useState } from 'react';
import { useEffects } from '@/shared/theme';
import { FINDER_SWEEP_TICKS } from '@/features/auth/constants/face.constant';
import { sweepStep } from '@/features/auth/model/face-finder';

export function useTickSweep(target: number): number {
  const { reduceMotion } = useEffects();
  const [lit, setLit] = useState(target);
  const litRef = useRef(target);
  useEffect(() => {
    if (reduceMotion) return;
    let frame = requestAnimationFrame(function step() {
      litRef.current = sweepStep(litRef.current, target, FINDER_SWEEP_TICKS);
      setLit(litRef.current);
      if (litRef.current !== target) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [reduceMotion, target]);
  return reduceMotion ? target : lit;
}
