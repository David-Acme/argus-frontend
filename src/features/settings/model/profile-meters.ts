import type { SettingsProfiles } from '@/core/types';

export type ProfileLevel = 'performance' | 'balanced' | 'quality';

export type ProfileLine = 'recommended' | 'other' | 'custom';

const LEVELS: readonly ProfileLevel[] = ['performance', 'balanced', 'quality'];

export const isProfileLevel = (id: string): id is ProfileLevel =>
  (LEVELS as readonly string[]).includes(id);

export const levelFraction = (level: ProfileLevel): number =>
  (LEVELS.indexOf(level) + 1) / LEVELS.length;

export function currentProfileId(profiles: SettingsProfiles): string | null {
  return profiles.profiles.find((profile) => profile.current)?.id ?? null;
}

export function profileLineOf(profiles: SettingsProfiles): ProfileLine {
  const current = currentProfileId(profiles);
  if (current === null) return 'custom';
  return current === profiles.recommendation.profile ? 'recommended' : 'other';
}
