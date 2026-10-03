import type { ISecureStorageService } from '@/core/interfaces';
import { IS_TAURI } from '@/shared/constants';

async function invokeSecure<T>(action: string, args: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  try {
    return await invoke<T>(action, args);
  } catch (error) {
    throw new Error(`Secure storage ${action} failed for ${String(args.key)}`, { cause: error });
  }
}

class WebSecureStorageService implements ISecureStorageService {
  async getStringAsync(key: string): Promise<string | null> {
    if (!IS_TAURI) return null;
    return (await invokeSecure<string | null>('argus_secure_get', { key })) ?? null;
  }

  async setStringAsync(key: string, value: string): Promise<void> {
    if (!IS_TAURI) throw new Error('SECURE_STORAGE_UNAVAILABLE|Secrets are only stored by the desktop app');
    await invokeSecure<void>('argus_secure_set', { key, value });
  }

  async deleteAsync(key: string): Promise<void> {
    if (!IS_TAURI) return;
    await invokeSecure<void>('argus_secure_delete', { key });
  }

  async hasAsync(key: string): Promise<boolean> {
    return (await this.getStringAsync(key)) != null;
  }
}

export const secureStorageService = new WebSecureStorageService();
