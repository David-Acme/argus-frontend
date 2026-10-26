import type {
  GuardEpisode,
  GuardFeedbackLabel,
  GuardReason,
  TamperStatus,
  TranslateFn,
  TranslationKey,
} from '@/core/types';
import { EPISODE_MARKED_RETENTION_DAYS } from '@/features/security/constants';
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

const DAY_SECONDS = 86_400;

export function withEpisode(rows: readonly GuardEpisode[], next: GuardEpisode): GuardEpisode[] {
  return rows.map((row) => (row.kind === next.kind && row.id === next.id ? next : row));
}

export function reviewedEpisode(
  episode: GuardEpisode,
  label: GuardFeedbackLabel,
  now: number
): GuardEpisode {
  return { ...episode, reviewLabel: label, reviewedAt: Math.floor(now / 1000) };
}

export function retainedEpisode(episode: GuardEpisode, keep: boolean): GuardEpisode {
  return {
    ...episode,
    retainUntil: keep ? episode.firstSeen + EPISODE_MARKED_RETENTION_DAYS * DAY_SECONDS : 0,
  };
}

export function isRetained(episode: Pick<GuardEpisode, 'retainUntil'>): boolean {
  return (episode.retainUntil ?? 0) > 0;
}

const OUTCOME_WORDS: Readonly<Record<EpisodeOutcome, TranslationKey>> = {
  alerted: 'screens.security.episodes.outcome.alerted',
  grouped: 'screens.security.episodes.outcome.grouped',
  routine: 'screens.security.episodes.outcome.routine',
  brief: 'screens.security.episodes.outcome.brief',
  quiet: 'screens.security.episodes.outcome.quiet',
  camera: 'screens.security.episodes.outcome.camera',
};

const REASON_WORDS: Readonly<Record<GuardReason, TranslationKey>> = {
  weapon: 'screens.security.episodes.reason.weapon',
  after_hours: 'screens.security.episodes.reason.after-hours',
  nobody_home: 'screens.security.episodes.reason.nobody-home',
  armed: 'screens.security.episodes.reason.armed',
  night: 'screens.security.episodes.reason.night',
  alert_zone: 'screens.security.episodes.reason.alert-zone',
  several_strangers: 'screens.security.episodes.reason.several-strangers',
  repeat_visits: 'screens.security.episodes.reason.repeat-visits',
  escalating: 'screens.security.episodes.reason.escalating',
  lingering: 'screens.security.episodes.reason.lingering',
  face_hidden: 'screens.security.episodes.reason.face-hidden',
  expected_guest: 'screens.security.episodes.reason.expected-guest',
  with_resident: 'screens.security.episodes.reason.with-resident',
  with_guest: 'screens.security.episodes.reason.with-guest',
  public_hours: 'screens.security.episodes.reason.public-hours',
  staff_hours: 'screens.security.episodes.reason.staff-hours',
  area_in_use: 'screens.security.episodes.reason.area-in-use',
  passerby: 'screens.security.episodes.reason.passerby',
  brief: 'screens.security.episodes.reason.brief',
  watchlist: 'screens.security.episodes.reason.watchlist',
};

export function outcomeText(episode: GuardEpisode, t: TranslateFn): string {
  const outcome = episodeOutcome(episode);
  const said = t(OUTCOME_WORDS[outcome]);
  if (outcome !== 'alerted' || episode.notifyCount <= 1) return said;
  return `${said} · ${t('screens.security.episodes.alerts-count', { count: String(episode.notifyCount) })}`;
}

export function reasonsText(episode: GuardEpisode, t: TranslateFn): string | null {
  const reasons = episode.notified ? raisingReasons(episode) : calmingReasons(episode);
  const shown = reasons.length > 0 ? reasons : raisingReasons(episode);
  if (shown.length === 0) return null;
  return t('screens.security.episodes.why', {
    reasons: shown.map((reason) => t(REASON_WORDS[reason])).join(', '),
  });
}

export function askReview(episode: Pick<GuardEpisode, 'kind' | 'notified'>): boolean {
  return episode.kind === 'person' && episode.notified;
}
