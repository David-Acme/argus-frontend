import { RESOURCE_COALESCE_MS, RESOURCE_DOMAINS, RESOURCE_SCOPES } from '@/shared/constants';
import type { ResourceDomain, ResourceNotice, ResourceScope } from '@/core/types';

export type ResourceClock = {
  setTimeout: (run: () => void, ms: number) => ReturnType<typeof setTimeout>;
};

export type ResourceSignal = {
  onChanged: (listener: (notice: ResourceNotice) => void) => () => void;
  onReconnected: (listener: () => void) => () => void;
  changed: (notice: ResourceNotice) => void;
  reconnected: () => void;
  flush: () => void;
};

export function createResourceSignal(
  clock: ResourceClock = { setTimeout: (run, ms) => setTimeout(run, ms) },
  coalesceMs: number = RESOURCE_COALESCE_MS
): ResourceSignal {
  const { setTimeout: schedule } = clock;
  const changedListeners = new Set<(notice: ResourceNotice) => void>();
  const reconnectListeners = new Set<() => void>();
  const pending = new Map<string, ResourceNotice>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = (): void => {
    timer = null;
    if (pending.size === 0) return;
    const notices = [...pending.values()];
    pending.clear();
    for (const notice of notices) for (const listener of changedListeners) listener(notice);
  };

  return {
    onChanged(listener) {
      changedListeners.add(listener);
      return () => changedListeners.delete(listener);
    },
    onReconnected(listener) {
      reconnectListeners.add(listener);
      return () => reconnectListeners.delete(listener);
    },
    changed(notice) {
      const key = `${notice.domain}:${notice.scope}`;
      const held = pending.get(key);
      const ids = new Set<number>([...(held?.ids ?? []), ...notice.ids]);
      pending.set(key, { ...notice, ids: [...ids] });
      if (timer != null) return;
      timer = schedule(flush, coalesceMs);
    },
    reconnected() {
      for (const listener of reconnectListeners) listener();
    },
    flush,
  };
}

export const resourceSignal = createResourceSignal();

export function createReloadGate(run: () => Promise<unknown>): () => Promise<void> {
  let inFlight: Promise<void> | null = null;
  let followUp = false;

  const reload = (): Promise<void> => {
    if (inFlight) {
      followUp = true;
      return inFlight;
    }
    const attempt: Promise<void> = run()
      .then(() => undefined)
      .finally(() => {
        if (inFlight !== attempt) return;
        inFlight = null;
        if (!followUp) return;
        followUp = false;
        void reload();
      });
    inFlight = attempt;
    return attempt;
  };

  return reload;
}

const domainOf = (value: unknown): ResourceDomain | null =>
  typeof value === 'string' && (RESOURCE_DOMAINS as readonly string[]).includes(value)
    ? (value as ResourceDomain)
    : null;

const scopeOf = (value: unknown): ResourceScope | null =>
  typeof value === 'string' && (RESOURCE_SCOPES as readonly string[]).includes(value)
    ? (value as ResourceScope)
    : null;

export function readResourceNotice(info: unknown): ResourceNotice | null {
  if (!info || typeof info !== 'object') return null;
  const value = info as { domain?: unknown; scope?: unknown; ids?: unknown };
  const domain = domainOf(value.domain);
  const scope = scopeOf(value.scope);
  if (!domain || !scope) return null;
  const ids = Array.isArray(value.ids)
    ? value.ids.filter((id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0)
    : [];
  return { domain, scope, ids };
}
