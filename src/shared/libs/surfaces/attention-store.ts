import { useSyncExternalStore } from 'react';
import type { AttentionItem } from './surface-registry';

export type ModuleAttention = AttentionItem & { module: string };

type Listener = () => void;

const NONE: readonly ModuleAttention[] = [];

const signature = (items: readonly AttentionItem[]): string =>
  items.map((item) => `${item.id}|${item.title}|${item.meta ?? ''}`).join('\n');

class AttentionStore {
  private readonly sources = new Map<string, { module: string; items: readonly AttentionItem[] }>();
  private readonly listeners = new Set<Listener>();
  private all: readonly ModuleAttention[] = NONE;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  snapshot = (): readonly ModuleAttention[] => this.all;

  report(source: string, module: string, items: readonly AttentionItem[]): void {
    const known = this.sources.get(source);
    if (known && known.module === module && signature(known.items) === signature(items)) return;
    this.sources.set(source, { module, items });
    this.publish();
  }

  drop(source: string): void {
    if (!this.sources.delete(source)) return;
    this.publish();
  }

  private publish(): void {
    this.all = [...this.sources.values()].flatMap(({ module, items }) =>
      items.map((item) => ({ ...item, module }))
    );
    for (const listener of this.listeners) listener();
  }
}

export const attentionStore = new AttentionStore();

export function useAttention(): readonly ModuleAttention[] {
  return useSyncExternalStore(attentionStore.subscribe, attentionStore.snapshot);
}

export function attentionByModule(items: readonly ModuleAttention[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.module, (counts.get(item.module) ?? 0) + 1);
  return counts;
}
