import type { CallControlAction } from '@/core/interfaces';

const ACTIONS: readonly CallControlAction[] = ['hangup', 'mute-on', 'mute-off'];

export function callControlActionOf(raw: string): CallControlAction | null {
  return ACTIONS.find((action) => action === raw) ?? null;
}
