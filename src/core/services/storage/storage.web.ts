import type { IStorageService } from '@/core/interfaces';
import type { StoragePrimitive } from '@/core/types';

const PREFIX = 'argus-storage:';

class StorageService implements IStorageService {
  private get store(): Storage {
    return window.localStorage;
  }

  private prefixed(key: string): string {
    return `${PREFIX}${key}`;
  }

  set(key: string, value: StoragePrimitive): void {
    this.store.setItem(this.prefixed(key), String(value));
  }

  getString(key: string): string | null {
    return this.store.getItem(this.prefixed(key));
  }

  getNumber(key: string): number | null {
    const raw = this.getString(key);
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? null : parsed;
  }

  getBoolean(key: string): boolean | null {
    const raw = this.getString(key);
    if (raw === null) return null;
    return raw === 'true';
  }

  setObject<T>(key: string, value: T): void {
    this.store.setItem(this.prefixed(key), JSON.stringify(value));
  }

  getObject<T>(key: string): T | null {
    const raw = this.getString(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  has(key: string): boolean {
    return this.store.getItem(this.prefixed(key)) !== null;
  }

  remove(key: string): void {
    this.store.removeItem(this.prefixed(key));
  }

  getAllKeys(): string[] {
    const store = this.store;

    const keys: string[] = [];
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (key?.startsWith(PREFIX)) {
        keys.push(key.slice(PREFIX.length));
      }
    }
    return keys;
  }

  clear(): void {
    const store = this.store;
    this.getAllKeys().forEach((key) => store.removeItem(this.prefixed(key)));
  }
}

export const storageService = new StorageService();
