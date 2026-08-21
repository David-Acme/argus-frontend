import { storageService } from '@/core/services/storage';
import { VIEW_CACHE_LIMIT, VIEW_CACHE_PREFIX, type ViewCacheKey } from '@/shared/constants';

/**
 * Snapshots of what a screen last rendered, kept in synchronous storage.
 *
 * Reads from the local database are async, so the first frame of a screen has
 * nothing to show even when the data is already on the device. Rehydrating a
 * snapshot on the first render removes that gap: the screen paints with real
 * rows and swaps them for the live query as soon as it answers.
 */
class ViewCacheService {
  private keyOf(key: ViewCacheKey, scope?: string): string {
    return `${VIEW_CACHE_PREFIX}${key}${scope ? `.${scope}` : ''}`;
  }

  read<T>(key: ViewCacheKey, scope?: string): T[] {
    return storageService.getObject<T[]>(this.keyOf(key, scope)) ?? [];
  }

  write<T>(key: ViewCacheKey, rows: readonly T[], scope?: string): void {
    const limited = rows.length > VIEW_CACHE_LIMIT ? rows.slice(0, VIEW_CACHE_LIMIT) : rows;
    const target = this.keyOf(key, scope);
    storageService.setObject(target, limited);
    // One snapshot per key: a scope is a window (a week, a month) and only the
    // one being looked at is worth keeping.
    if (scope == null) return;
    const base = `${VIEW_CACHE_PREFIX}${key}.`;
    for (const stored of storageService.getAllKeys()) {
      if (stored !== target && stored.startsWith(base)) storageService.remove(stored);
    }
  }

  readValue<T>(key: ViewCacheKey, scope?: string): T | null {
    return storageService.getObject<T>(this.keyOf(key, scope));
  }

  writeValue<T>(key: ViewCacheKey, value: T, scope?: string): void {
    storageService.setObject(this.keyOf(key, scope), value);
  }

  /** Wipes every snapshot; a session change must not leak another user's rows. */
  clear(): void {
    for (const key of storageService.getAllKeys()) {
      if (key.startsWith(VIEW_CACHE_PREFIX)) storageService.remove(key);
    }
  }
}

export const viewCacheService = new ViewCacheService();
