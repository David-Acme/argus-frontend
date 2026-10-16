import { createMMKV } from 'react-native-mmkv';
import type { IInstanceStorageService } from '@/core/interfaces';
import { log } from '@/core/services/log';
import { secureStorageService } from '@/core/services/secure-storage';
import { storageService } from '@/core/services/storage';
import { IS_ANDROID } from '@/shared/constants';

const INSTANCE_STORE_ID = 'argus-instance';

class AndroidInstanceStorageService implements IInstanceStorageService {
  private readonly store = createMMKV({ id: INSTANCE_STORE_ID });

  async getStringAsync(key: string): Promise<string | null> {
    const stored = this.store.getString(key) ?? null;
    if (stored !== null) return stored;
    return this.migrate(key);
  }

  async setStringAsync(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async deleteAsync(key: string): Promise<void> {
    this.store.remove(key);
    storageService.remove(key);
    await secureStorageService.deleteAsync(key);
  }

  private async migrate(key: string): Promise<string | null> {
    const shared = storageService.getString(key);
    if (shared !== null) {
      this.store.set(key, shared);
      storageService.remove(key);
      return shared;
    }
    return this.migrateFromKeystore(key);
  }

  private async migrateFromKeystore(key: string): Promise<string | null> {
    const keystoreBound = await secureStorageService.getStringAsync(key);
    if (keystoreBound === null) return null;
    this.store.set(key, keystoreBound);
    try {
      await secureStorageService.deleteAsync(key);
    } catch (error) {
      log.error('instance-storage', `the keystore-bound copy of ${key} was not removed`, error);
    }
    return keystoreBound;
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
