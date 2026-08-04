import * as SecureStore from 'expo-secure-store';

import type { ISecureStorageService } from '@/core/interfaces';

class SecureStorageService implements ISecureStorageService {
  async getStringAsync(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  }

  async setStringAsync(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  }

  async deleteAsync(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  }

  async hasAsync(key: string): Promise<boolean> {
    return (await SecureStore.getItemAsync(key)) != null;
  }
}

export const secureStorageService = new SecureStorageService();
