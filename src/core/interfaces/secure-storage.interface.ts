export interface ISecureStorageService {
  getStringAsync(key: string): Promise<string | null>;
  setStringAsync(key: string, value: string): Promise<void>;
  deleteAsync(key: string): Promise<void>;
  hasAsync(key: string): Promise<boolean>;
}
