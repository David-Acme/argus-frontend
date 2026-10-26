import type { CallAudioDevice } from '@/core/types';

export type SpeakerAction =
  | { kind: 'none' }
  | { kind: 'toggle'; on: boolean; target: CallAudioDevice }
  | { kind: 'pick'; on: boolean };

const PICKED_KINDS: ReadonlySet<CallAudioDevice['kind']> = new Set([
  'bluetooth',
  'wired',
  'streaming',
]);

export function speakerActionOf(devices: readonly CallAudioDevice[]): SpeakerAction {
  const routes = devices.filter((device) => device.direction === 'route');
  const speaker = routes.find((device) => device.kind === 'speaker');
  if (!speaker) return { kind: 'none' };
  const on = speaker.active;
  const others = routes.filter((device) => device.kind !== 'speaker');
  if (others.some((device) => PICKED_KINDS.has(device.kind))) return { kind: 'pick', on };
  const target = on ? others[0] : speaker;
  return target ? { kind: 'toggle', on, target } : { kind: 'none' };
}
