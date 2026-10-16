import type { IInstanceStorageService } from '@/core/interfaces';
import { log } from '@/core/services/log';
import { secureStorageService } from '@/core/services/secure-storage';
import { storageService } from '@/core/services/storage';
import { IS_ANDROID } from '@/shared/constants';

class AndroidInstanceStorageService implements IInstanceStorageService {
  async getStringAsync(key: string): Promise<string | null> {
    const stored = storageService.getString(key);
    if (stored !== null) return stored;
    const keystoreBound = await secureStorageService.getStringAsync(key);
    if (keystoreBound === null) return null;
    storageService.set(key, keystoreBound);
    try {
      await secureStorageService.deleteAsync(key);
    } catch (error) {
      log.error('instance-storage', `the keystore-bound copy of ${key} was not removed`, error);
    }
    return keystoreBound;
  }

  async setStringAsync(key: string, value: string): Promise<void> {
    storageService.set(key, value);
  }

  async deleteAsync(key: string): Promise<void> {
    storageService.remove(key);
    await secureStorageService.deleteAsync(key);
  }
}

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

export const instanceStorageService: IInstanceStorageService = IS_ANDROID
  ? new AndroidInstanceStorageService()
  : new SecureStoreInstanceStorageService();
