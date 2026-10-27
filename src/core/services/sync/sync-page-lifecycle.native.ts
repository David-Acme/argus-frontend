import type { PageLifecycleHandlers } from '@/core/types';

export function watchPageLifecycle(handlers: PageLifecycleHandlers): () => void {
  return () => void handlers;
}
