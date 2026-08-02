export interface IStorageService {
  set(key: string, value: string | number | boolean): void;
  getString(key: string): string | null;
  getNumber(key: string): number | null;
  getBoolean(key: string): boolean | null;
  setObject<T>(key: string, value: T): void;
  getObject<T>(key: string): T | null;
  has(key: string): boolean;
  remove(key: string): void;
  getAllKeys(): string[];
  clear(): void;
}
