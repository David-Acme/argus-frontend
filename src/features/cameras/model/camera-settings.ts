import type { ICameraCapabilities, ICameraClip, IZoneCacheRow } from '@/core/interfaces';
import type { TranslationKey } from '@/core/types';

export const SETTINGS_SECTIONS = [
  'privacy',
  'detection',
  'listen',
  'gaze',
  'patrol',
  'places',
  'maintenance',
  'device',
  'advanced',
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export type SettingsInput = {
  features: ICameraCapabilities | null;
  update: boolean;
  remove: boolean;
  aim: boolean;
  maintenance: boolean;
};

export function settingsSectionsOf({
  features,
  update,
  remove,
  aim,
  maintenance,
}: SettingsInput): readonly SettingsSection[] {
  const ptz = update && features?.ptz === true;
  const shown: Record<SettingsSection, boolean> = {
    privacy: update && features?.privacy === true,
    detection: update && (features?.motion === true || features?.autoTrack === true),
    listen: true,
    gaze: ptz,
    patrol: ptz && aim && features?.presets === true,
    places: ptz,
    maintenance,
    device: true,
    advanced: update || remove,
  };
  return SETTINGS_SECTIONS.filter((section) => shown[section]);
}

export function settingsSummaryOf(sections: readonly SettingsSection[]): TranslationKey {
  if (sections.includes('patrol')) return 'screens.cameras.rows.settings-patrol';
  if (sections.includes('privacy')) return 'screens.cameras.rows.settings-privacy';
  return 'screens.cameras.rows.settings-plain';
}

export function startOfDay(now: number): number {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}

export function clipsToday(clips: readonly Pick<ICameraClip, 'startedAt'>[], now: number): number {
  const since = startOfDay(now) / 1000;
  return clips.filter((clip) => clip.startedAt >= since).length;
}

export function zoneNames(zones: readonly Pick<IZoneCacheRow, 'name' | 'isEnabled'>[]): string[] {
  return zones
    .filter((zone) => zone.isEnabled)
    .map((zone) => zone.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

export type RecordingsLine = 'off' | 'private' | 'paused' | 'unread' | 'reading' | 'count';

export type RecordingsLineInput = {
  recordMode: string;
  masked: boolean;
  enabled: boolean;
  status: 'idle' | 'loading' | 'ready' | 'failed';
  hasClips: boolean;
};

export function recordingsLineOf(input: RecordingsLineInput): RecordingsLine {
  if (input.recordMode === 'off') return 'off';
  if (input.hasClips) return 'count';
  if (input.masked) return 'private';
  if (!input.enabled) return 'paused';
  if (input.status === 'failed') return 'unread';
  return input.status === 'ready' ? 'count' : 'reading';
}
