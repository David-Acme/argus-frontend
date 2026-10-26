import { describe, expect, test } from 'bun:test';
import type { CameraPatrol } from '@/core/types';
import { CAMERA_PATROL_ROUTE, readCameraPatrol } from '@/core/contracts/camera-patrol.contract';
import {
  PATROL_DEFAULT_DWELL_SECONDS,
  PATROL_MAX_STOPS,
  addStop,
  crossesMidnight,
  formatPatrolHour,
  isEmptyPatrolPatch,
  moveStop,
  neighboursRepeat,
  parseDwell,
  patrolDraftOf,
  patrolPatch,
  patrolProblems,
  removeStop,
  stopName,
  withPatrolPatch,
} from '@/features/cameras/model/camera-patrol';

const PRESETS = [
  { id: '1', name: 'Entrada' },
  { id: '2', name: 'Patio' },
  { id: '3', name: '' },
];

function patrol(overrides: Partial<CameraPatrol> = {}): CameraPatrol {
  return {
    cameraId: 7,
    stops: ['1', '2'],
    dwellSeconds: 30,
    enabled: true,
    window: null,
    createdAt: 1_700_000_000,
    updatedAt: null,
    ...overrides,
  };
}

describe('the patrol answer', () => {
  test('reads the backend shape with and without a window', () => {
    expect(readCameraPatrol({ patrol: null })).toEqual({ patrol: null });
    expect(
      readCameraPatrol({
        patrol: {
          cameraId: 7,
          stops: ['1', '2'],
          dwellSeconds: 30,
          enabled: false,
          window: { startHour: 22, endHour: 6 },
          createdAt: 10,
          updatedAt: 20,
        },
      })
    ).toEqual({
      patrol: patrol({
        enabled: false,
        window: { startHour: 22, endHour: 6 },
        createdAt: 10,
        updatedAt: 20,
      }),
    });
  });

  test('refuses an answer without the patrol key', () => {
    expect(readCameraPatrol({ stops: [] })).toBeNull();
    expect(readCameraPatrol(null)).toBeNull();
  });

  test('the route is the camera patrol route', () => {
    expect(CAMERA_PATROL_ROUTE('12')).toBe('/camera/12/patrol');
  });
});

describe('the patrol draft', () => {
  test('a new patrol starts empty with the backend default dwell, enabled and all day', () => {
    expect(patrolDraftOf(null)).toEqual({
      stops: [],
      dwellSeconds: PATROL_DEFAULT_DWELL_SECONDS,
      enabled: true,
      window: null,
    });
  });

  test('neighbours repeat, wrap-around included', () => {
    expect(neighboursRepeat(['1', '1'])).toBe(true);
    expect(neighboursRepeat(['1', '2', '1'])).toBe(true);
    expect(neighboursRepeat(['1', '2', '3'])).toBe(false);
    expect(neighboursRepeat(['1'])).toBe(false);
  });

  test('the problems mirror the backend validation', () => {
    const draft = patrolDraftOf(null);
    expect(patrolProblems(draft, PRESETS)).toEqual(['stops-count']);
    expect(patrolProblems({ ...draft, stops: ['1', '2'] }, PRESETS)).toEqual([]);
    expect(patrolProblems({ ...draft, stops: ['1', '2', '1'] }, PRESETS)).toEqual(['stops-repeat']);
    expect(patrolProblems({ ...draft, stops: ['1', '9'] }, PRESETS)).toEqual(['stops-unknown']);
    expect(patrolProblems({ ...draft, stops: ['1', '9'] }, [])).toEqual([]);
    expect(patrolProblems({ ...draft, stops: ['1', '2'], dwellSeconds: 4 }, PRESETS)).toEqual([
      'dwell',
    ]);
    expect(patrolProblems({ ...draft, stops: ['1', '2'], dwellSeconds: 601 }, PRESETS)).toEqual([
      'dwell',
    ]);
    expect(
      patrolProblems({ ...draft, stops: ['1', '2'], dwellSeconds: Number.NaN }, PRESETS)
    ).toEqual(['dwell']);
    expect(
      patrolProblems({ ...draft, stops: ['1', '2'], window: { startHour: 5, endHour: 5 } }, PRESETS)
    ).toEqual(['window']);
    const many = Array.from({ length: PATROL_MAX_STOPS + 1 }, (_, index) =>
      index % 2 === 0 ? '1' : '2'
    );
    expect(patrolProblems({ ...draft, stops: many }, PRESETS)).toContain('stops-count');
  });

  test('a create sends every field, an edit only what changed', () => {
    const draft = {
      stops: ['1', '2'],
      dwellSeconds: 20,
      enabled: true,
      window: { startHour: 22, endHour: 6 },
    };
    expect(patrolPatch(null, draft)).toEqual(draft);
    expect(patrolPatch(patrol(), { ...patrolDraftOf(patrol()) })).toEqual({});
    expect(isEmptyPatrolPatch(patrolPatch(patrol(), patrolDraftOf(patrol())))).toBe(true);
    expect(patrolPatch(patrol(), { ...patrolDraftOf(patrol()), dwellSeconds: 45 })).toEqual({
      dwellSeconds: 45,
    });
    expect(
      patrolPatch(patrol({ window: { startHour: 1, endHour: 2 } }), {
        ...patrolDraftOf(patrol()),
        window: null,
      })
    ).toEqual({
      window: null,
    });
    expect(
      patrolPatch(patrol(), { ...patrolDraftOf(patrol()), stops: ['2', '1'], enabled: false })
    ).toEqual({
      stops: ['2', '1'],
      enabled: false,
    });
  });

  test('the optimistic patrol applies a patch, and an edit without a patrol needs stops', () => {
    expect(withPatrolPatch(null, { enabled: false }, 7)).toBeNull();
    expect(withPatrolPatch(null, { stops: ['1', '2'] }, 7)?.stops).toEqual(['1', '2']);
    expect(withPatrolPatch(patrol(), { window: { startHour: 8, endHour: 9 } }, 7)?.window).toEqual({
      startHour: 8,
      endHour: 9,
    });
    expect(
      withPatrolPatch(patrol({ window: { startHour: 8, endHour: 9 } }), { window: null }, 7)?.window
    ).toBeNull();
    expect(withPatrolPatch(patrol(), { enabled: false }, 7)?.enabled).toBe(false);
  });

  test('stops are added, moved and removed in order', () => {
    const draft = addStop(addStop(addStop(patrolDraftOf(null), '1'), '2'), '3');
    expect(draft.stops).toEqual(['1', '2', '3']);
    expect(moveStop(draft, 2, -1).stops).toEqual(['1', '3', '2']);
    expect(moveStop(draft, 0, -1)).toBe(draft);
    expect(moveStop(draft, 2, 1)).toBe(draft);
    expect(removeStop(draft, 1).stops).toEqual(['1', '3']);
    const full = {
      ...draft,
      stops: Array.from({ length: PATROL_MAX_STOPS }, (_, index) => String(index)),
    };
    expect(addStop(full, 'x')).toBe(full);
  });

  test('labels and parsing', () => {
    expect(stopName('1', PRESETS, '?')).toBe('Entrada');
    expect(stopName('3', PRESETS, '?')).toBe('?');
    expect(stopName('9', PRESETS, '?')).toBe('?');
    expect(formatPatrolHour(6)).toBe('06:00');
    expect(crossesMidnight({ startHour: 22, endHour: 6 })).toBe(true);
    expect(crossesMidnight({ startHour: 8, endHour: 18 })).toBe(false);
    expect(parseDwell(' 45 ')).toBe(45);
    expect(parseDwell('4.5')).toBeNaN();
    expect(parseDwell('')).toBeNaN();
  });
});
