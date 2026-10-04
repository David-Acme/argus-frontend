import type { ICameraCapabilities } from '@/core/interfaces';

const FLAGS = [
  'ptz',
  'presets',
  'talk',
  'microphone',
  'privacy',
  'led',
  'dayNight',
  'motion',
  'autoTrack',
  'alarm',
  'sdCard',
  'streamOnly',
] as const satisfies readonly (keyof ICameraCapabilities)[];

export function capabilitiesFromRow(list: readonly string[]): ICameraCapabilities | null {
  if (list.length === 0) return null;
  const present = new Set(list);
  const capabilities: ICameraCapabilities = {};
  for (const flag of FLAGS) capabilities[flag] = present.has(flag);
  return capabilities;
}

export function resolveCapabilities(
  row: readonly string[],
  remote: ICameraCapabilities | null,
): ICameraCapabilities | null {
  const synced = capabilitiesFromRow(row);
  if (!synced) return remote;
  return { ...synced, catalogId: remote?.catalogId };
}

export function hasDeviceControls(capabilities: ICameraCapabilities | null): boolean {
  if (!capabilities) return false;
  return [
    capabilities.ptz,
    capabilities.privacy,
    capabilities.led,
    capabilities.dayNight,
    capabilities.motion,
    capabilities.autoTrack,
  ].some((value) => value === true);
}
