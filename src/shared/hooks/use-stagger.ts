import { useReduceMotion } from '@/shared/hooks/use-reduce-motion';

export function useStagger(count: number, stepMs = 70): number[] {
  const reduceMotion = useReduceMotion();
  return Array.from({ length: count }, (_, i) => (reduceMotion ? 0 : i * stepMs));
}