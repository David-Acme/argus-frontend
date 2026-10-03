import { useReduceMotion } from '@/shared/hooks/use-reduce-motion';

export function useStagger(stepMs = 70): (index: number) => number {
  const reduceMotion = useReduceMotion();
  return (index) => (reduceMotion ? 0 : index * stepMs);
}