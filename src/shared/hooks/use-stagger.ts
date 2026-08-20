import { useReduceMotion } from '@/shared/hooks/use-reduce-motion';

/**
 * Staggered entrance delays for a group of elements. With reduced motion
 * enabled every delay collapses to zero. Consumers build their own entering
 * animation with the delay, e.g. `itemIn.delay(delays[1])`.
 */
export function useStagger(count: number, stepMs = 70): number[] {
  const reduceMotion = useReduceMotion();
  return Array.from({ length: count }, (_, i) => (reduceMotion ? 0 : i * stepMs));
}