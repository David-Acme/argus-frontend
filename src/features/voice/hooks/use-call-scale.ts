import { callScaleOf, useWindowHeight, type CallScale } from '@/shared/theme';

export function useCallScale(): CallScale {
  return callScaleOf(useWindowHeight());
}
