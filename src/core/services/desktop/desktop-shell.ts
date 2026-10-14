import { invoke } from '@tauri-apps/api/core';

import type { NetError } from '@/core/types';

function shellError(error: unknown): NetError {
  const raw = error instanceof Error ? error.message : String(error);
  const [, ...rest] = raw.split('|');
  return { code: 'DESKTOP_SHELL_ERROR', message: rest.join('|') || raw };
}

export async function readAutostart(): Promise<boolean> {
  try {
    return await invoke<boolean>('argus_autostart_get');
  } catch (error) {
    throw shellError(error);
  }
}

export async function writeAutostart(enabled: boolean): Promise<void> {
  try {
    await invoke<void>('argus_autostart_set', { enabled });
  } catch (error) {
    throw shellError(error);
  }
}
