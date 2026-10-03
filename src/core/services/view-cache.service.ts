import { storageService } from '@/core/services/storage';
import type { IViewCacheWriteOptions } from '@/core/interfaces';
import type { ViewCacheKey } from '@/core/types';
import {
  buildViewCacheStorageKey,
  VIEW_CACHE_PAGE_SIZE,
  VIEW_CACHE_PREFIX,
} from '@/shared/constants';

class ViewCacheService {
  private userId = 'anonymous';
  private revisions = new Map<string, number>();
  private subscribers = new Map<string, Set<() => void>>();
  private snapshots = new Map<string, { revision: number; value: unknown }>();

  setUserId(userId: number | string | null): void {
    this.userId = userId == null ? 'anonymous' : String(userId);
  }

  private keyOf(key: ViewCacheKey, scope?: string): string {
    return buildViewCacheStorageKey(this.userId, key, scope);
  }

  subscribe(key: ViewCacheKey, scope: string | undefined, listener: () => void): () => void {
    const target = this.keyOf(key, scope);
    const listeners = this.subscribers.get(target) ?? new Set<() => void>();
    listeners.add(listener);
    this.subscribers.set(target, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size > 0) return;
      this.subscribers.delete(target);
      this.snapshots.delete(target);
    };
  }

  rowsSnapshot<T>(key: ViewCacheKey, scope?: string): readonly T[] {
    return this.snapshot(this.keyOf(key, scope), () => this.read<T>(key, scope));
  }

  valueSnapshot<T>(key: ViewCacheKey, scope?: string): T | null {
    return this.snapshot(this.keyOf(key, scope), () => this.readValue<T>(key, scope));
  }

  private snapshot<V>(target: string, load: () => V): V {
    const revision = this.revisions.get(target) ?? 0;
    const cached = this.snapshots.get(target);
    if (cached && cached.revision === revision) return cached.value as V;
    const value = load();
    this.snapshots.set(target, { revision, value });
    return value;
  }

  revision(key: ViewCacheKey, scope?: string): number {
    return this.revisions.get(this.keyOf(key, scope)) ?? 0;
  }

  private notify(target: string): void {
    this.revisions.set(target, (this.revisions.get(target) ?? 0) + 1);
    this.subscribers.get(target)?.forEach((listener) => listener());
  }

  read<T>(key: ViewCacheKey, scope?: string): T[] {
    const target = this.keyOf(key, scope);
    return storageService.getObject<T[]>(target) ?? [];
  }

  write<T>(
    key: ViewCacheKey,
    rows: readonly T[],
    scope?: string,
    options: IViewCacheWriteOptions = {},
  ): void {
    const limit = options.limit ?? VIEW_CACHE_PAGE_SIZE;
    const limited = rows.length > limit ? rows.slice(0, limit) : rows;
    const target = this.keyOf(key, scope);
    this.store(target, limited);
  }

  retainScopes(key: ViewCacheKey, kept: ReadonlySet<string>): void {
    const base = `${VIEW_CACHE_PREFIX}${this.userId}.${key}.`;
    for (const stored of storageService.getAllKeys()) {
      if (stored.startsWith(base) && !kept.has(stored.slice(base.length))) {
        storageService.remove(stored);
        this.notify(stored);
      }
    }
  }

  readValue<T>(key: ViewCacheKey, scope?: string): T | null {
    const target = this.keyOf(key, scope);
    return storageService.getObject<T>(target);
  }

  writeValue<T>(key: ViewCacheKey, value: T, scope?: string): void {
    this.store(this.keyOf(key, scope), value);
  }

  private store(target: string, value: unknown): void {
    const serialized = JSON.stringify(value);
    if (storageService.getString(target) === serialized) return;
    storageService.set(target, serialized);
    this.notify(target);
  }

  clear(): void {
    for (const key of storageService.getAllKeys()) {
      if (key.startsWith(VIEW_CACHE_PREFIX)) {
        storageService.remove(key);
        this.notify(key);
      }
    }
  }
}

export const viewCacheService = new ViewCacheService();
