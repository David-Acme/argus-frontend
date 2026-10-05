import type { InfiniteFooter } from '@/core/types';

export type InfiniteFooterInput = {
  count: number;
  hasMore: boolean;
  failed: boolean;
  endAfter: number;
};

export const INFINITE_END_THRESHOLD = 0.5;

export function infiniteFooter({
  count,
  hasMore,
  failed,
  endAfter,
}: InfiniteFooterInput): InfiniteFooter {
  if (failed && hasMore) return 'error';
  if (hasMore) return 'loading';
  return count >= endAfter ? 'end' : 'none';
}
