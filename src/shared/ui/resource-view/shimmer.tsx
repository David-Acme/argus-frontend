import type { ReactNode } from 'react';
import { useEffects } from '@/shared/theme';
import { cssShimmer } from './shimmer-style';

export type ShimmerProviderProps = { children: ReactNode };

export function ShimmerProvider({ children }: ShimmerProviderProps) {
  return <>{children}</>;
}

export function useShimmerStyle() {
  const { reduceMotion } = useEffects();
  return cssShimmer(reduceMotion);
}
