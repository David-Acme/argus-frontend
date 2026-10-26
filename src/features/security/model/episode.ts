import type {
  GuardEpisode,
  GuardReason,
  TamperStatus,
  TranslateFn,
  TranslationKey,
} from '@/core/types';
import { tamperStatusOf } from '@/features/security/model/tamper-notice';

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

const SUBJECT_TITLES: Partial<Record<string, TranslationKey>> = {
  '': 'screens.security.episodes.subject.stranger',
  stranger: 'screens.security.episodes.subject.stranger',
  unobserved: 'screens.security.episodes.subject.unobserved',
  accompanied: 'screens.security.episodes.subject.accompanied',
};

const TAMPER_TITLES: Record<TamperStatus, TranslationKey> = {
  covered: 'screens.security.episodes.tamper.covered',
  whiteout: 'screens.security.episodes.tamper.whiteout',
  blinded: 'screens.security.episodes.tamper.blinded',
  partial_cover: 'screens.security.episodes.tamper.partial-cover',
  blurred: 'screens.security.episodes.tamper.blurred',
  moved: 'screens.security.episodes.tamper.moved',
  dark_sudden: 'screens.security.episodes.tamper.dark-sudden',
  unreachable: 'screens.security.episodes.tamper.unreachable',
};

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

export function needsReview(
  episode: Pick<GuardEpisode, 'kind' | 'notified' | 'reviewLabel'>
): boolean {
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

export function episodeTitle(
  t: TranslateFn,
  episode: Pick<GuardEpisode, 'kind' | 'status' | 'subject' | 'people'>
): string {
  if (episode.kind === 'camera') {
    const status = tamperStatusOf(episode.status);
    return t(status ? TAMPER_TITLES[status] : 'screens.security.episodes.tamper.other');
  }
  if (episode.subject === 'several')
    return t('screens.security.episodes.subject.several', {
      count: String(Math.max(2, episode.people)),
    });
  return t(SUBJECT_TITLES[episode.subject] ?? 'screens.security.episodes.subject.other');
}
