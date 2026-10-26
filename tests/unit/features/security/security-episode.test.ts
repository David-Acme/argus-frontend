import { describe, expect, test } from 'bun:test';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import type { GuardEpisode, TranslateFn } from '@/core/types';
import {
  askReview,
  calmingReasons,
  episodeOutcome,
  episodeTitle,
  formatDuration,
  isRetained,
  needsReview,
  outcomeText,
  raisingReasons,
  reasonsText,
  retainedEpisode,
  reviewedEpisode,
  withEpisode,
} from '@/features/security/model/episode';

const t: TranslateFn = (key, ...rest) => translate(localeDictionaries.es, key, ...rest);

function episode(overrides: Partial<GuardEpisode>): GuardEpisode {
  return {
    id: 1,
    kind: 'person',
    cameraId: 3,
    cameraName: '',
    state: 'resolved',
    stage: 'closed',
    danger: 'medium',
    notified: false,
    notifyCount: 0,
    highestNotified: 'none',
    subject: 'stranger',
    people: 1,
    reasons: [],
    firstSeen: 100,
    lastSeen: 160,
    observations: 3,
    groupId: 0,
    reviewLabel: '',
    reviewedAt: 0,
    resolution: 'left',
    spoke: false,
    sounded: false,
    status: '',
    environmentId: 1,
    ...overrides,
  };
}

describe('guard episodes', () => {
  test('the outcome says why the owner was or was not told', () => {
    expect(episodeOutcome(episode({ notified: true }))).toBe('alerted');
    expect(episodeOutcome(episode({ groupId: 7 }))).toBe('grouped');
    expect(episodeOutcome(episode({ reasons: ['area_in_use', 'public_hours'] }))).toBe('routine');
    expect(episodeOutcome(episode({ reasons: ['brief'] }))).toBe('brief');
    expect(episodeOutcome(episode({}))).toBe('quiet');
    expect(episodeOutcome(episode({ kind: 'camera' }))).toBe('camera');
  });

  test('reasons are split into what raised and what calmed the danger', () => {
    const story = episode({
      reasons: ['passerby', 'night', 'alert_zone', 'after_hours', 'unknown'],
    });
    expect(raisingReasons(story)).toEqual(['after_hours', 'night']);
    expect(calmingReasons(story)).toEqual(['passerby']);
  });

  test('only notified person episodes ask for a review, once', () => {
    expect(needsReview(episode({ notified: true }))).toBe(true);
    expect(needsReview(episode({ notified: true, reviewLabel: 'useful' }))).toBe(false);
    expect(needsReview(episode({ notified: false }))).toBe(false);
    expect(needsReview(episode({ kind: 'camera', notified: true }))).toBe(false);
  });

  test('durations stay short and readable', () => {
    expect(formatDuration(18)).toBe('18 s');
    expect(formatDuration(200)).toBe('3 min');
    expect(formatDuration(3600)).toBe('1 h');
    expect(formatDuration(4900)).toBe('1 h 22 min');
  });

  test('the title names the subject or the camera trouble in words', () => {
    expect(episodeTitle(t, episode({ subject: '' }))).toBe('Persona desconocida');
    expect(episodeTitle(t, episode({ subject: 'unobserved' }))).toBe('Alguien sin identificar');
    expect(episodeTitle(t, episode({ subject: 'several', people: 1 }))).toBe(
      '2 personas desconocidas'
    );
    expect(episodeTitle(t, episode({ kind: 'camera', status: 'covered' }))).toBe(
      t('screens.security.episodes.tamper.covered')
    );
    expect(episodeTitle(t, episode({ kind: 'camera', status: 'bogus' }))).toBe(
      t('screens.security.episodes.tamper.other')
    );
  });
});

describe('the episode detail', () => {
  test('the outcome is said once, with the alert count when Argus repeated it', () => {
    expect(outcomeText(episode({ notified: true, notifyCount: 1 }), t)).toBe('Te avisó');
    expect(outcomeText(episode({ notified: true, notifyCount: 3 }), t)).toBe('Te avisó · 3 avisos');
    expect(outcomeText(episode({ reasons: ['brief'] }), t)).toBe('Solo un momento, sin aviso');
  });

  test('the reasons name what raised an alert, or what calmed a quiet one', () => {
    expect(reasonsText(episode({ notified: true, reasons: ['night', 'passerby'] }), t)).toBe(
      'Por qué: de noche'
    );
    expect(reasonsText(episode({ reasons: ['passerby', 'night'] }), t)).toBe('Por qué: de paso');
    expect(reasonsText(episode({ reasons: ['night'] }), t)).toBe('Por qué: de noche');
    expect(reasonsText(episode({}), t)).toBeNull();
  });

  test('a review and a retention replace only their own episode', () => {
    const one = episode({ id: 1 });
    const two = episode({ id: 2 });
    const reviewed = reviewedEpisode(one, 'useful', 5_000);
    expect(reviewed).toMatchObject({ reviewLabel: 'useful', reviewedAt: 5 });
    expect(withEpisode([one, two], reviewed)).toEqual([reviewed, two]);
    expect(isRetained(retainedEpisode(one, true))).toBe(true);
    expect(retainedEpisode(one, true).retainUntil).toBe(one.firstSeen + 120 * 86_400);
    expect(isRetained(retainedEpisode(one, false))).toBe(false);
  });

  test('only a person Argus told you about asks ¿Acertó?', () => {
    expect(askReview(episode({ notified: true }))).toBe(true);
    expect(askReview(episode({}))).toBe(false);
    expect(askReview(episode({ kind: 'camera', notified: true }))).toBe(false);
  });
});
