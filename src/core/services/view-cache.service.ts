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
      if (listeners.size === 0) this.subscribers.delete(target);
    };
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
    storageService.setObject(target, limited);
    this.notify(target);
    if (scope == null || !options.replaceScoped) return;

    const base = `${VIEW_CACHE_PREFIX}${this.userId}.${key}.`;
    for (const stored of storageService.getAllKeys()) {
      if (stored !== target && stored.startsWith(base)) {
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
    const target = this.keyOf(key, scope);
    storageService.setObject(target, value);
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
