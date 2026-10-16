import type { IInstanceStorageService } from '@/core/interfaces';
import { secureStorageService } from '@/core/services/secure-storage';

class SecureStoreInstanceStorageService implements IInstanceStorageService {
  async getStringAsync(key: string): Promise<string | null> {
    return secureStorageService.getStringAsync(key);
  }

  async setStringAsync(key: string, value: string): Promise<void> {
    await secureStorageService.setStringAsync(key, value);
  }

  async deleteAsync(key: string): Promise<void> {
    await secureStorageService.deleteAsync(key);
  }
}

export const instanceStorageService: IInstanceStorageService = new SecureStoreInstanceStorageService();
