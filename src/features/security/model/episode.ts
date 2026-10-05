import type { GuardEpisode, GuardReason } from '@/core/types';

const RAISING: readonly GuardReason[] = [
  'watchlist',
  'weapon',
  'after_hours',
  'nobody_home',
  'armed',
  'night',
  'alert_zone',
  'several_strangers',
  'repeat_visits',
  'escalating',
  'lingering',
  'face_hidden',
];

const CALMING: readonly GuardReason[] = [
  'public_hours',
  'staff_hours',
  'area_in_use',
  'passerby',
  'expected_guest',
  'with_resident',
  'with_guest',
];

export type EpisodeOutcome = 'alerted' | 'grouped' | 'routine' | 'brief' | 'quiet' | 'camera';

function known(reasons: readonly string[], vocabulary: readonly GuardReason[]): GuardReason[] {
  return vocabulary.filter((reason) => reasons.includes(reason));
}

export function raisingReasons(episode: Pick<GuardEpisode, 'reasons'>, limit = 2): GuardReason[] {
  return known(episode.reasons, RAISING).slice(0, limit);
}

export function calmingReasons(episode: Pick<GuardEpisode, 'reasons'>, limit = 2): GuardReason[] {
  return known(episode.reasons, CALMING).slice(0, limit);
}

export function episodeOutcome(
  episode: Pick<GuardEpisode, 'kind' | 'notified' | 'groupId' | 'reasons'>
): EpisodeOutcome {
  if (episode.kind === 'camera') return 'camera';
  if (episode.notified) return 'alerted';
  if (episode.groupId > 0) return 'grouped';
  if (known(episode.reasons, CALMING).length > 0) return 'routine';
  if (episode.reasons.includes('brief')) return 'brief';
  return 'quiet';
}

export function episodeKey(episode: Pick<GuardEpisode, 'kind' | 'id'>): string {
  return `${episode.kind}-${episode.id}`;
}

export function needsReview(episode: Pick<GuardEpisode, 'kind' | 'notified' | 'reviewLabel'>): boolean {
  return episode.kind === 'person' && episode.notified && episode.reviewLabel === '';
}

export function durationSeconds(episode: Pick<GuardEpisode, 'firstSeen' | 'lastSeen'>): number {
  return Math.max(0, episode.lastSeen - episode.firstSeen);
}

export function formatDuration(seconds: number): string {
  if (seconds < 90) return `${Math.max(0, Math.round(seconds))} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
