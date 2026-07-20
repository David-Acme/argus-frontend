import { createMMKV, type MMKV } from 'react-native-mmkv';
import type { IStorageService, StoragePrimitive } from './storage.types';

class StorageService implements IStorageService {
  private readonly instance: MMKV;

  constructor() {
    this.instance = createMMKV({ id: 'argus-storage' });
  }

  set(key: string, value: StoragePrimitive): void {
    this.instance.set(key, value);
  }

  getString(key: string): string | null {
    return this.instance.getString(key) ?? null;
  }

  getNumber(key: string): number | null {
    return this.instance.getNumber(key) ?? null;
  }

  getBoolean(key: string): boolean | null {
    return this.instance.getBoolean(key) ?? null;
  }

  setObject<T>(key: string, value: T): void {
    this.instance.set(key, JSON.stringify(value));
  }

  getObject<T>(key: string): T | null {
    const raw = this.instance.getString(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  has(key: string): boolean {
    return this.instance.contains(key);
  }

  remove(key: string): void {
    this.instance.remove(key);
  }

  getAllKeys(): string[] {
    return this.instance.getAllKeys();
  }

  clear(): void {
    this.instance.clearAll();
  }
}

export const storageService = new StorageService();
