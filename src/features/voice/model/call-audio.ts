import type { CallAudioDevice, CallAudioKind, IconName } from '@/core/types';

export type CallAudioGroups = {
  routes: CallAudioDevice[];
  inputs: CallAudioDevice[];
  outputs: CallAudioDevice[];
};

const LIVEKIT_OUTPUTS: Record<string, CallAudioKind> = {
  speaker: 'speaker',
  force_speaker: 'speaker',
  earpiece: 'earpiece',
  default: 'earpiece',
  headset: 'wired',
  bluetooth: 'bluetooth',
};

const ICONS: Record<CallAudioKind, IconName> = {
  earpiece: 'smartphone',
  speaker: 'volume-2',
  bluetooth: 'bluetooth',
  wired: 'headphones',
  streaming: 'volume-2',
  microphone: 'mic',
  output: 'volume-2',
  unknown: 'volume-2',
};

const NAMED_KINDS: readonly CallAudioKind[] = ['bluetooth', 'streaming', 'microphone', 'output'];

export function livekitOutputKind(id: string): CallAudioKind {
  return LIVEKIT_OUTPUTS[id] ?? 'unknown';
}

export function callAudioIcon(kind: CallAudioKind): IconName {
  return ICONS[kind];
}

export function callAudioLabel(
  device: CallAudioDevice,
  kindLabel: (kind: CallAudioKind) => string
): string {
  const name = device.name.trim();
  return NAMED_KINDS.includes(device.kind) && name !== '' ? name : kindLabel(device.kind);
}

export function groupCallAudio(devices: readonly CallAudioDevice[]): CallAudioGroups {
  return {
    routes: devices.filter((device) => device.direction === 'route'),
    inputs: devices.filter((device) => device.direction === 'input'),
    outputs: devices.filter((device) => device.direction === 'output'),
  };
}

function desktopDeviceOf(value: unknown): CallAudioDevice | null {
  if (typeof value !== 'object' || value === null) return null;
  const { id, direction, name, active } = value as Record<string, unknown>;
  if (
    typeof id !== 'string' ||
    id === '' ||
    typeof name !== 'string' ||
    typeof active !== 'boolean'
  )
    return null;
  if (direction !== 'input' && direction !== 'output') return null;
  return { id, kind: direction === 'input' ? 'microphone' : 'output', direction, name, active };
}

export function desktopDevicesOf(raw: unknown): CallAudioDevice[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(desktopDeviceOf).filter((device): device is CallAudioDevice => device !== null);
}

const comparable = (name: string): string => name.trim().toLowerCase();

export function inputNamed(
  devices: readonly CallAudioDevice[],
  label: string
): CallAudioDevice | null {
  const wanted = comparable(label);
  if (wanted === '') return null;
  const inputs = devices.filter(
    (device) => device.direction === 'input' && comparable(device.name) !== ''
  );
  return (
    inputs.find((device) => comparable(device.name) === wanted) ??
    inputs.find(
      (device) =>
        comparable(device.name).includes(wanted) || wanted.includes(comparable(device.name))
    ) ??
    null
  );
}
