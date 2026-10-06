import type { IApiError } from '@/core/interfaces';

type RefusalListener = (path: string, error: IApiError) => void;

const listeners = new Set<RefusalListener>();

const WATCHED_CODES: ReadonlySet<string> = new Set(['MODULE_DISABLED']);

export function onRefusal(listener: RefusalListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function reportRefusal(path: string, error: IApiError | null): void {
  if (!error || !WATCHED_CODES.has(error.code)) return;
  listeners.forEach((listener) => listener(path, error));
}
