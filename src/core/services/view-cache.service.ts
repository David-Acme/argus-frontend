import { storageService } from '@/core/services/storage';
import { ViewCacheMemory } from '@/core/services/view-cache-memory';
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
  private readonly memory = new ViewCacheMemory();

  private keyOf(key: ViewCacheKey, scope?: string): string {
    return `${VIEW_CACHE_PREFIX}${key}${scope ? `.${scope}` : ''}`;
  }

  /**
   * Reads all durable snapshots while the session splash is up. Later screen
   * reads are served from this map, then live Watermelon observers refresh it.
   */
  prime(): void {
    const entries: [string, unknown][] = [];
    for (const key of storageService.getAllKeys()) {
      if (!key.startsWith(VIEW_CACHE_PREFIX)) continue;
      const value = storageService.getObject<unknown>(key);
      if (value !== null) entries.push([key, value]);
    }
    this.memory.hydrate(entries);
  }

  read<T>(key: ViewCacheKey, scope?: string): T[] {
    const target = this.keyOf(key, scope);
    const cached = this.memory.read<T[]>(target);
    if (cached !== null) return cached;

    const value = storageService.getObject<T[]>(target);
    if (value !== null) this.memory.write(target, value);
    return value ?? [];
  }

  write<T>(key: ViewCacheKey, rows: readonly T[], scope?: string): void {
    const limited = rows.length > VIEW_CACHE_LIMIT ? rows.slice(0, VIEW_CACHE_LIMIT) : rows;
    const target = this.keyOf(key, scope);
    storageService.setObject(target, limited);
    this.memory.write(target, limited);
    // One snapshot per key: a scope is a window (a week, a month) and only the
    // one being looked at is worth keeping.
    if (scope == null) return;
    const base = `${VIEW_CACHE_PREFIX}${key}.`;
    for (const stored of storageService.getAllKeys()) {
      if (stored !== target && stored.startsWith(base)) {
        storageService.remove(stored);
        this.memory.remove(stored);
      }
    }
  }

  readValue<T>(key: ViewCacheKey, scope?: string): T | null {
    const target = this.keyOf(key, scope);
    const cached = this.memory.read<T>(target);
    if (cached !== null) return cached;

    const value = storageService.getObject<T>(target);
    if (value !== null) this.memory.write(target, value);
    return value;
  }

  writeValue<T>(key: ViewCacheKey, value: T, scope?: string): void {
    const target = this.keyOf(key, scope);
    storageService.setObject(target, value);
    this.memory.write(target, value);
  }

  /** Wipes every snapshot; a session change must not leak another user's rows. */
  clear(): void {
    for (const key of storageService.getAllKeys()) {
      if (key.startsWith(VIEW_CACHE_PREFIX)) storageService.remove(key);
    }
    this.memory.clear();
  }
}

export const viewCacheService = new ViewCacheService();
