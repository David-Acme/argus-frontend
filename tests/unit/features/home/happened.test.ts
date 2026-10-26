import { describe, expect, test } from 'bun:test';
import type { GuardEpisode, TranslateFn } from '@/core/types';
import type { MomentFormat } from '@/features/home/model/camera-moments';
import { happenedRows, happenedStatus, type HappenedInput } from '@/features/home/model/happened';

const t = ((key: string, params?: Record<string, string>) =>
  key.endsWith('yesterday-at') ? `ayer ${params?.time ?? ''}` : key) as TranslateFn;

const format: MomentFormat = {
  t,
  time: (value) => `${value.getHours()}:${String(value.getMinutes()).padStart(2, '0')}`,
  day: () => 'lun',
};

const NOW = new Date(2026, 9, 21, 15, 0).getTime();

const seconds = (day: number, hour: number, minute: number) =>
  new Date(2026, 9, day, hour, minute).getTime() / 1000;

function episode(overrides: Partial<GuardEpisode>): GuardEpisode {
  return {
    id: 1,
    kind: 'person',
    cameraId: 3,
    cameraName: 'Puerta principal',
    state: 'resolved',
    stage: 'closed',
    danger: 'medium',
    notified: false,
    notifyCount: 0,
    highestNotified: 'none',
    subject: 'stranger',
    people: 1,
    reasons: [],
    firstSeen: 0,
    lastSeen: seconds(21, 14, 45),
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

const input: HappenedInput = {
  limit: 3,
  now: NOW,
  format,
  canReview: true,
  pending: (row) => row.notified && row.reviewLabel === '',
  titleOf: (row) => (row.kind === 'camera' ? 'Vista tapada' : `Persona ${row.id}`),
};

const EPISODES = [
  episode({ id: 1, lastSeen: seconds(21, 14, 45) }),
  episode({ id: 2, kind: 'camera', cameraName: 'Sala', lastSeen: seconds(21, 11, 20) }),
  episode({
    id: 3,
    notified: true,
    cameraName: 'Patio trasero',
    lastSeen: seconds(20, 21, 53),
  }),
  episode({ id: 4, lastSeen: seconds(19, 8, 0) }),
];

describe('Lo que pasó', () => {
  test('what waits for a review comes first, then the newest, up to the limit', () => {
    const rows = happenedRows(EPISODES, input);
    expect(rows.map((row) => row.key)).toEqual(['person-3', 'person-1', 'camera-2']);
    expect(rows[0]).toEqual({
      key: 'person-3',
      title: 'Persona 3',
      meta: 'Patio trasero · ayer 21:53',
      icon: 'alert',
      attention: true,
      review: true,
    });
    expect(rows[1]?.icon).toBe('user');
    expect(rows[1]?.attention).toBe(false);
    expect(rows[2]?.icon).toBe('eyeoff');
  });

  test('a role that cannot review sees no «Revisar» and the plain newest order', () => {
    const rows = happenedRows(EPISODES, { ...input, canReview: false });
    expect(rows.map((row) => row.key)).toEqual(['person-1', 'camera-2', 'person-3']);
    expect(rows.some((row) => row.review)).toBe(false);
  });

  test('rows paint as soon as they exist; an empty feed waits for its first answer', () => {
    expect(happenedStatus(2, 'loading')).toBe('ready');
    expect(happenedStatus(0, 'loading')).toBe('loading');
    expect(happenedStatus(0, 'ready')).toBe('empty');
    expect(happenedStatus(0, 'failed')).toBe('failed');
  });
});
