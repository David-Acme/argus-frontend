import type { ISecureStorageService } from '@/core/interfaces';
import { IS_TAURI } from '@/shared/constants';

const FALLBACK_PREFIX = 'argus.secure.';

async function invokeSecure(action: string, args: Record<string, unknown>): Promise<unknown> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke(action, args);
}

class WebSecureStorageService implements ISecureStorageService {
  async getStringAsync(key: string): Promise<string | null> {
    if (IS_TAURI) {
      try {
        const value = (await invokeSecure('argus_secure_get', { key })) as string | null;
        return value ?? null;
      } catch {
        // fall back to localStorage
      }
    }
    return localStorage.getItem(FALLBACK_PREFIX + key);
  }

  async setStringAsync(key: string, value: string): Promise<void> {
    if (IS_TAURI) {
      try {
        await invokeSecure('argus_secure_set', { key, value });
        return;
      } catch {
        // fall back to localStorage
      }
    }
    localStorage.setItem(FALLBACK_PREFIX + key, value);
  }

  async deleteAsync(key: string): Promise<void> {
    if (IS_TAURI) {
      try {
        await invokeSecure('argus_secure_delete', { key });
        return;
      } catch {
        // fall back to localStorage
      }
    }
    localStorage.removeItem(FALLBACK_PREFIX + key);
  }

  async hasAsync(key: string): Promise<boolean> {
    return (await this.getStringAsync(key)) != null;
  }
}

export const secureStorageService = new WebSecureStorageService();
