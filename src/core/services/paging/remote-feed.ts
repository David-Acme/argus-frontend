import type { IServiceResponse } from '@/core/interfaces';
import type { PagedRows, RemotePage, ViewCacheKey } from '@/core/types';
import { viewCacheService } from '@/core/services/view-cache.service';

export type RemoteFeedSnapshot<T, C> = {
  rows: readonly T[];
  next: C | null;
};

export type RemoteFeedOrder<T> = {
  keyOf: (row: T) => string;
  compare: (left: T, right: T) => number;
};

export type RemoteFeedConfig<T, C> = RemoteFeedOrder<T> & {
  key: ViewCacheKey;
  fetch: (scope: string, cursor: C | null) => Promise<IServiceResponse<RemotePage<T, C>>>;
  pinned?: readonly string[];
};

function union<T>(fresh: readonly T[], kept: readonly T[], order: RemoteFeedOrder<T>): T[] {
  const seen = new Set(fresh.map(order.keyOf));
  return [...fresh, ...kept.filter((row) => !seen.has(order.keyOf(row)))].sort(order.compare);
}

export function mergeHead<T, C>(
  previous: RemoteFeedSnapshot<T, C> | null,
  page: RemotePage<T, C>,
  order: RemoteFeedOrder<T>,
): RemoteFeedSnapshot<T, C> {
  if (!previous || page.next === null || previous.rows.length <= page.rows.length) {
    return { rows: [...page.rows].sort(order.compare), next: page.next };
  }
  return { rows: union(page.rows, previous.rows, order), next: previous.next };
}

export function mergeTail<T, C>(
  previous: RemoteFeedSnapshot<T, C>,
  page: RemotePage<T, C>,
  order: RemoteFeedOrder<T>,
): RemoteFeedSnapshot<T, C> {
  const known = new Set(previous.rows.map(order.keyOf));
  const grew = page.rows.some((row) => !known.has(order.keyOf(row)));
  return { rows: union(page.rows, previous.rows, order), next: grew ? page.next : null };
}

export function feedRows<T, C>(snapshot: RemoteFeedSnapshot<T, C> | null): PagedRows<T> {
  return { rows: snapshot?.rows ?? [], hasMore: snapshot?.next != null };
}

export class RemoteFeed<T, C> {
  private readonly config: RemoteFeedConfig<T, C>;
  private readonly loading = new Map<string, Promise<boolean>>();
  private readonly generations = new Map<string, number>();
  private readonly scopes = new Set<string>();

  constructor(config: RemoteFeedConfig<T, C>) {
    this.config = config;
    for (const scope of config.pinned ?? []) this.scopes.add(scope);
  }

  focus(scope: string): void {
    const kept = new Set([scope, ...(this.config.pinned ?? [])]);
    for (const known of [...this.scopes]) if (!kept.has(known)) this.scopes.delete(known);
    this.scopes.add(scope);
    viewCacheService.retainScopes(this.config.key, kept);
  }

  mutateAll(update: (rows: readonly T[]) => readonly T[]): () => void {
    const before = new Map<string, RemoteFeedSnapshot<T, C>>();
    for (const scope of this.scopes) {
      const snapshot = this.snapshot(scope);
      if (!snapshot) continue;
      before.set(scope, snapshot);
      this.bump(scope);
      this.store(scope, { rows: update(snapshot.rows), next: snapshot.next });
    }
    return () => {
      for (const [scope, snapshot] of before) {
        this.bump(scope);
        this.store(scope, snapshot);
      }
    };
  }

  get key(): ViewCacheKey {
    return this.config.key;
  }

  snapshot(scope: string): RemoteFeedSnapshot<T, C> | null {
    return viewCacheService.readValue<RemoteFeedSnapshot<T, C>>(this.config.key, scope);
  }

  async refresh(scope: string): Promise<boolean> {
    const generation = this.bump(scope);
    const result = await this.config.fetch(scope, null);
    if (generation !== this.generations.get(scope)) return result.ok;
    if (!result.ok || !result.info) return false;
    this.store(scope, mergeHead(this.snapshot(scope), result.info, this.config));
    return true;
  }

  loadMore(scope: string): Promise<boolean> {
    const running = this.loading.get(scope);
    if (running) return running;
    const task = this.fetchNext(scope).finally(() => this.loading.delete(scope));
    this.loading.set(scope, task);
    return task;
  }

  mutate(scope: string, update: (rows: readonly T[]) => readonly T[]): void {
    this.bump(scope);
    const previous = this.snapshot(scope);
    this.store(scope, { rows: update(previous?.rows ?? []), next: previous?.next ?? null });
  }

  private async fetchNext(scope: string): Promise<boolean> {
    const previous = this.snapshot(scope);
    if (!previous || previous.next === null) return true;
    const result = await this.config.fetch(scope, previous.next);
    if (!result.ok || !result.info) return false;
    const current = this.snapshot(scope);
    if (!current || current.next === null) return true;
    this.store(scope, mergeTail(current, result.info, this.config));
    return true;
  }

  private bump(scope: string): number {
    const next = (this.generations.get(scope) ?? 0) + 1;
    this.generations.set(scope, next);
    return next;
  }

  private store(scope: string, snapshot: RemoteFeedSnapshot<T, C>): void {
    this.scopes.add(scope);
    viewCacheService.writeValue(this.config.key, snapshot, scope);
  }
}
