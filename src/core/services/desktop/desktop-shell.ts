import { invoke } from '@tauri-apps/api/core';

import { toNetError } from '@/core/services/net/net-persistence';

export async function readAutostart(): Promise<boolean> {
  try {
    return await invoke<boolean>('argus_autostart_get');
  } catch (error) {
    throw toNetError(error, 'NETWORK_ERROR');
  }
}

export async function writeAutostart(enabled: boolean): Promise<void> {
  try {
    await invoke<void>('argus_autostart_set', { enabled });
  } catch (error) {
    throw toNetError(error, 'NETWORK_ERROR');
  }
}
