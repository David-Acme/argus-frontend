import { describe, expect, test } from 'bun:test';
import type { GuardEpisode } from '@/core/types';
import {
  calmingReasons,
  episodeOutcome,
  formatDuration,
  needsReview,
  raisingReasons,
} from '@/features/security/model/episode';

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
    const story = episode({ reasons: ['passerby', 'night', 'alert_zone', 'after_hours', 'unknown'] });
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
});
