import type { ModuleRecord } from '@/core/types';
import { moduleStatus } from '@/features/modules/model/module-text';

export type SwitchMove = 'install' | 'disable';

export type ModuleSwitch =
  { kind: 'none' } | { kind: 'switch'; on: boolean; move: SwitchMove | null };

export type ModuleDanger = 'uninstall' | 'erase' | null;

const BUSY = new Set(['installing', 'paused', 'failed']);

export const moduleBusy = (module: ModuleRecord): boolean => BUSY.has(moduleStatus(module));

export function moduleSwitchOf(module: ModuleRecord): ModuleSwitch {
  if (module.kind !== 'available') return { kind: 'none' };
  if (moduleBusy(module)) return { kind: 'switch', on: module.job?.kind === 'install', move: null };
  if (module.lifecycle === 'active') return { kind: 'switch', on: true, move: 'disable' };
  const blocked =
    module.lifecycle === 'not_installed' && module.hardware?.verdict === 'insufficient';
  return { kind: 'switch', on: false, move: blocked ? null : 'install' };
}

export function moduleDangerOf(module: ModuleRecord): ModuleDanger {
  if (module.kind !== 'available' || moduleBusy(module)) return null;
  if (module.lifecycle === 'uninstalled_data_kept') return 'erase';
  return module.lifecycle === 'active' || module.lifecycle === 'disabled' ? 'uninstall' : null;
}
