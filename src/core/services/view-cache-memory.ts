/**
 * Process-memory mirror of snapshots persisted in MMKV. It is deliberately
 * storage-agnostic so screens can read a preloaded value without touching disk.
 */
export class ViewCacheMemory {
  private readonly values = new Map<string, unknown>();

  hydrate(entries: Iterable<readonly [string, unknown]>): void {
    this.values.clear();
    for (const [key, value] of entries) this.values.set(key, value);
  }

  read<T>(key: string): T | null {
    return (this.values.get(key) as T | undefined) ?? null;
  }

  write<T>(key: string, value: T): void {
    this.values.set(key, value);
  }

  remove(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
  }
}
