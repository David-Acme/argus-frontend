import type {
  GuardEnvironment,
  GuardEpisode,
  GuardExpectedGuest,
  GuardMode,
  TranslateFn,
} from '@/core/types';
import type { AuraTone } from '@/shared/theme';
import type { PresenceState } from '@/shared/ui/presence';
import type { StatusStat, StatusTone } from '@/shared/ui/status';
import { MODE_LABEL, MODE_META } from '@/features/security/constants';
import { headlineMode } from './environments';
import { episodeTitle, needsReview } from './episode';

export type SecurityStatusInput = {
  environments: readonly GuardEnvironment[];
  episodes: readonly GuardEpisode[];
  guests: readonly GuardExpectedGuest[];
  canReview: boolean;
  now: number;
};

export type SecurityCounts = { ongoing: number; review: number | null; visits: number };

export type SecurityStatus = {
  tone: StatusTone;
  aura: AuraTone;
  presence: PresenceState;
  mode: GuardMode | null;
  alert: GuardEpisode | null;
  counts: SecurityCounts;
};

export type StatusWords = { sentence: string; meta: string };

export type StatsForm = 'phone' | 'band' | 'band-wide';

const ALERT_DANGER: ReadonlySet<string> = new Set(['high', 'critical']);

const ON_WATCH: ReadonlySet<GuardMode> = new Set(['night', 'away', 'armed']);

export function alertEpisode(episodes: readonly GuardEpisode[]): GuardEpisode | null {
  const raised = episodes.filter(
    (episode) => episode.state === 'active' && episode.notified && ALERT_DANGER.has(episode.danger)
  );
  return raised.reduce<GuardEpisode | null>(
    (latest, episode) => (latest && latest.lastSeen >= episode.lastSeen ? latest : episode),
    null
  );
}

export function visitsToday(guests: readonly GuardExpectedGuest[], now: number): number {
  const endOfDay = new Date(now).setHours(24, 0, 0, 0);
  return guests.filter(
    (guest) => guest.validUntil * 1000 > now && guest.validFrom * 1000 < endOfDay
  ).length;
}

function toneOf(alert: GuardEpisode | null, counts: SecurityCounts): StatusTone {
  if (alert) return 'alert';
  return counts.ongoing > 0 ? 'attention' : 'calm';
}

function auraOf(tone: StatusTone, mode: GuardMode | null): AuraTone {
  if (tone === 'alert') return 'alert';
  if (tone === 'attention') return 'attn';
  return mode && ON_WATCH.has(mode) ? 'duty' : 'calm';
}

function presenceOf(tone: StatusTone, mode: GuardMode | null): PresenceState {
  if (tone === 'alert') return 'alert';
  return mode && ON_WATCH.has(mode) ? 'watch' : 'idle';
}

export function securityStatus(input: SecurityStatusInput): SecurityStatus {
  const mode = headlineMode(input.environments);
  const alert = alertEpisode(input.episodes);
  const counts: SecurityCounts = {
    ongoing: input.episodes.filter((episode) => episode.state === 'active').length,
    review: input.canReview ? input.episodes.filter(needsReview).length : null,
    visits: visitsToday(input.guests, input.now),
  };
  const tone = toneOf(alert, counts);
  return {
    tone,
    aura: auraOf(tone, mode),
    presence: presenceOf(tone, mode),
    mode,
    alert,
    counts,
  };
}

function alertWords(alert: GuardEpisode, t: TranslateFn): StatusWords {
  const camera = alert.cameraName;
  const what = episodeTitle(t, alert);
  if (alert.kind === 'camera')
    return { sentence: what, meta: t('screens.security.hero.alert-meta', { camera }) };
  const sentence =
    alert.subject === 'several'
      ? t('screens.security.hero.alert-several', {
          count: String(Math.max(2, alert.people)),
          camera,
        })
      : t('screens.security.hero.alert-someone', { camera });
  return { sentence, meta: t('screens.security.hero.alert-what', { what }) };
}

export function statusWords(status: SecurityStatus, t: TranslateFn): StatusWords {
  if (status.alert) return alertWords(status.alert, t);
  if (status.mode) return { sentence: t(MODE_LABEL[status.mode]), meta: t(MODE_META[status.mode]) };
  return {
    sentence: t('screens.security.hero.mixed'),
    meta: t('screens.security.hero.mixed-meta'),
  };
}

function reviewStat(review: number, t: TranslateFn): StatusStat {
  return {
    value: String(review),
    label: t('screens.security.hero.review'),
    tone: review > 0 ? 'attn' : undefined,
  };
}

export function statusStats(counts: SecurityCounts, t: TranslateFn, form: StatsForm): StatusStat[] {
  const ongoing: StatusStat = {
    value: String(counts.ongoing),
    label: t('screens.security.hero.in-progress'),
  };
  const review = counts.review === null ? null : reviewStat(counts.review, t);
  const visits: StatusStat = {
    icon: 'door',
    value: String(counts.visits),
    label: t(counts.visits === 1 ? 'screens.security.hero.visit' : 'screens.security.hero.visits'),
  };
  if (form === 'phone') return review ? [ongoing, review, visits] : [ongoing, visits];
  const band = review ? [review, ongoing, visits] : [ongoing, visits];
  return form === 'band' ? band.slice(0, 1) : band;
}
