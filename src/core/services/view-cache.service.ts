import { storageService } from '@/core/services/storage';
import type { IViewCacheWriteOptions } from '@/core/interfaces';
import type { ViewCacheKey } from '@/core/types';
import {
  buildViewCacheStorageKey,
  VIEW_CACHE_PAGE_SIZE,
  VIEW_CACHE_PREFIX,
} from '@/shared/constants';

/**
 * Snapshots of what a screen last rendered, kept in synchronous storage.
 *
 * Reads from the local database are async, so the first frame of a screen has
 * nothing to show even when the data is already on the device. Rehydrating a
 * snapshot on the first render removes that gap: the screen paints with real
 * rows and swaps them for the live query as soon as it answers.
 */
class ViewCacheService {
  private userId = 'anonymous';
  /** Signal-only memory: the rows remain exclusively in MMKV. */
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

  /**
   * MMKV reads synchronously, so no JavaScript data mirror is required.
   * Kept as an idempotent session hook for callers that previously primed one.
   */
  prime(): void {}

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

    // Calendar windows are intentionally single-page snapshots: when the
    // visible month changes, old values must not be displayed for the new one.
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

  /** Wipes every snapshot; a session change must not leak another user's rows. */
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
