import type {
  CameraAim,
  CameraAimActivity,
  CameraAimConfig,
  CameraAimPatch,
  CameraAimSettings,
  CameraNoAimSector,
} from '@/core/types';

export const NO_AIM_SECTOR_MAX = 8;
export const NO_AIM_SECTOR_NAME_MAX = 40;
export const PAN_LIMIT = 180;
export const TILT_LIMIT = 90;

export type CameraLeaseView = 'free' | 'mine' | 'argus' | 'other';

export type CameraSightActivity = 'watching' | 'returning' | null;

export type SectorMark = {
  pan: number;
  tilt: number;
};

export type SectorProblem = 'too-many' | 'name' | 'pan' | 'tilt' | 'order';

const WATCHING: ReadonlySet<CameraAimActivity> = new Set(['looking', 'following', 'patrolling']);

const EMPTY_SETTINGS: CameraAimSettings = {
  activeLook: false,
  followIntruders: false,
  noAimSectors: [],
};

export function leaseView(aim: Pick<CameraAim, 'lease'> | null): CameraLeaseView {
  if (!aim) return 'free';
  const { holder, mine } = aim.lease;
  if (holder === 'none') return 'free';
  if (mine) return 'mine';
  if (holder === 'argus') return 'argus';
  return 'other';
}

export function sightActivity(aim: Pick<CameraAim, 'activity'> | null): CameraSightActivity {
  if (!aim) return null;
  if (WATCHING.has(aim.activity)) return 'watching';
  if (aim.activity === 'returning') return 'returning';
  return null;
}

export function aimSettingsOf(
  remote: Pick<CameraAim, 'settings'> | null,
  synced: CameraAimConfig | undefined,
): CameraAimSettings {
  if (remote) return remote.settings;
  if (!synced) return EMPTY_SETTINGS;
  return {
    activeLook: synced.activeLook,
    followIntruders: synced.followIntruders,
    noAimSectors: synced.noAimSectors,
  };
}

export function homePresetOf(
  remote: Pick<CameraAim, 'homePreset'> | null,
  synced: CameraAimConfig | undefined,
): string | null {
  if (remote) return remote.homePreset;
  return synced?.homePreset ?? null;
}

export function withAimPatch(aim: CameraAim | null, patch: CameraAimPatch): CameraAim | null {
  if (!aim) return aim;
  return { ...aim, settings: { ...aim.settings, ...patch } };
}

const round = (value: number): number => Math.round(value * 10) / 10;

export function closeSector(start: SectorMark, end: SectorMark, name: string): CameraNoAimSector {
  return {
    name: name.trim(),
    panFrom: round(Math.min(start.pan, end.pan)),
    panTo: round(Math.max(start.pan, end.pan)),
    tiltFrom: round(Math.min(start.tilt, end.tilt)),
    tiltTo: round(Math.max(start.tilt, end.tilt)),
  };
}

export function sectorProblem(sectors: readonly CameraNoAimSector[]): SectorProblem | null {
  if (sectors.length > NO_AIM_SECTOR_MAX) return 'too-many';
  for (const sector of sectors) {
    if (sector.name.trim().length === 0 || sector.name.length > NO_AIM_SECTOR_NAME_MAX) return 'name';
    if (Math.abs(sector.panFrom) > PAN_LIMIT || Math.abs(sector.panTo) > PAN_LIMIT) return 'pan';
    if (Math.abs(sector.tiltFrom) > TILT_LIMIT || Math.abs(sector.tiltTo) > TILT_LIMIT) return 'tilt';
    if (sector.panFrom > sector.panTo || sector.tiltFrom > sector.tiltTo) return 'order';
  }
  return null;
}

export function formatDegrees(value: number): string {
  return `${round(value)}°`;
}

export function sectorRange(sector: CameraNoAimSector): string {
  return `${formatDegrees(sector.panFrom)} – ${formatDegrees(sector.panTo)} · ${formatDegrees(sector.tiltFrom)} – ${formatDegrees(sector.tiltTo)}`;
}
