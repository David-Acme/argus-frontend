import type { CameraPatrol, CameraPatrolPatch, CameraPatrolWindow, TranslationKey } from '@/core/types';
import type { CameraPreset } from '@/features/cameras/model/camera-presets';
import { nowSeconds } from '@/shared/libs/day';

export const PATROL_MIN_STOPS = 2;
export const PATROL_MAX_STOPS = 16;
export const PATROL_MIN_DWELL_SECONDS = 5;
export const PATROL_MAX_DWELL_SECONDS = 600;
export const PATROL_DEFAULT_DWELL_SECONDS = 30;
export const PATROL_DEFAULT_WINDOW: CameraPatrolWindow = { startHour: 22, endHour: 6 };
export const PATROL_HOURS: readonly number[] = Array.from({ length: 24 }, (_, hour) => hour);

export type PatrolDraft = {
  stops: string[];
  dwellSeconds: number;
  enabled: boolean;
  window: CameraPatrolWindow | null;
};

export type PatrolProblem = 'stops-count' | 'stops-repeat' | 'stops-unknown' | 'dwell' | 'window';

export const PATROL_PROBLEM_LABEL = {
  'stops-count': 'screens.cameras.patrol.problem.stops-count',
  'stops-repeat': 'screens.cameras.patrol.problem.stops-repeat',
  'stops-unknown': 'screens.cameras.patrol.problem.stops-unknown',
  dwell: 'screens.cameras.patrol.problem.dwell',
  window: 'screens.cameras.patrol.problem.window',
} as const satisfies Record<PatrolProblem, TranslationKey>;

export function patrolDraftOf(patrol: CameraPatrol | null): PatrolDraft {
  if (!patrol) {
    return { stops: [], dwellSeconds: PATROL_DEFAULT_DWELL_SECONDS, enabled: true, window: null };
  }
  return {
    stops: [...patrol.stops],
    dwellSeconds: patrol.dwellSeconds,
    enabled: patrol.enabled,
    window: patrol.window ? { ...patrol.window } : null,
  };
}

export function neighboursRepeat(stops: readonly string[]): boolean {
  if (stops.length < 2) return false;
  return stops.some((stop, index) => stop === stops[(index + 1) % stops.length]);
}

export function patrolProblems(draft: PatrolDraft, presets: readonly CameraPreset[]): PatrolProblem[] {
  const problems: PatrolProblem[] = [];
  if (draft.stops.length < PATROL_MIN_STOPS || draft.stops.length > PATROL_MAX_STOPS) problems.push('stops-count');
  if (neighboursRepeat(draft.stops)) problems.push('stops-repeat');
  if (presets.length > 0) {
    const saved = new Set(presets.map((preset) => preset.id));
    if (draft.stops.some((stop) => !saved.has(stop))) problems.push('stops-unknown');
  }
  const dwell = draft.dwellSeconds;
  if (!Number.isInteger(dwell) || dwell < PATROL_MIN_DWELL_SECONDS || dwell > PATROL_MAX_DWELL_SECONDS) {
    problems.push('dwell');
  }
  if (draft.window && draft.window.startHour === draft.window.endHour) problems.push('window');
  return problems;
}

const sameStops = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((stop, index) => stop === right[index]);

const sameWindow = (left: CameraPatrolWindow | null, right: CameraPatrolWindow | null): boolean =>
  left === right ||
  (left !== null && right !== null && left.startHour === right.startHour && left.endHour === right.endHour);

export function patrolPatch(patrol: CameraPatrol | null, draft: PatrolDraft): CameraPatrolPatch {
  if (!patrol) {
    return { stops: [...draft.stops], dwellSeconds: draft.dwellSeconds, enabled: draft.enabled, window: draft.window };
  }
  const patch: CameraPatrolPatch = {};
  if (!sameStops(patrol.stops, draft.stops)) patch.stops = [...draft.stops];
  if (patrol.dwellSeconds !== draft.dwellSeconds) patch.dwellSeconds = draft.dwellSeconds;
  if (patrol.enabled !== draft.enabled) patch.enabled = draft.enabled;
  if (!sameWindow(patrol.window, draft.window)) patch.window = draft.window;
  return patch;
}

export const isEmptyPatrolPatch = (patch: CameraPatrolPatch): boolean => Object.keys(patch).length === 0;

export function withPatrolPatch(patrol: CameraPatrol | null, patch: CameraPatrolPatch, cameraId: number): CameraPatrol | null {
  if (!patrol && !patch.stops) return patrol;
  const base: CameraPatrol = patrol ?? {
    cameraId,
    stops: [],
    dwellSeconds: PATROL_DEFAULT_DWELL_SECONDS,
    enabled: true,
    window: null,
    createdAt: nowSeconds(),
    updatedAt: null,
  };
  return {
    ...base,
    stops: patch.stops ? [...patch.stops] : base.stops,
    dwellSeconds: patch.dwellSeconds ?? base.dwellSeconds,
    enabled: patch.enabled ?? base.enabled,
    window: patch.window === undefined ? base.window : patch.window,
  };
}

export function addStop(draft: PatrolDraft, presetId: string): PatrolDraft {
  if (draft.stops.length >= PATROL_MAX_STOPS) return draft;
  return { ...draft, stops: [...draft.stops, presetId] };
}

export function removeStop(draft: PatrolDraft, index: number): PatrolDraft {
  return { ...draft, stops: draft.stops.filter((_, position) => position !== index) };
}

export function moveStop(draft: PatrolDraft, index: number, offset: -1 | 1): PatrolDraft {
  const target = index + offset;
  if (index < 0 || index >= draft.stops.length || target < 0 || target >= draft.stops.length) return draft;
  const stops = [...draft.stops];
  const moving = stops[index];
  const other = stops[target];
  if (moving === undefined || other === undefined) return draft;
  stops[index] = other;
  stops[target] = moving;
  return { ...draft, stops };
}

export function stopName(stop: string, presets: readonly CameraPreset[], fallback: string): string {
  const name = presets.find((preset) => preset.id === stop)?.name.trim();
  return name && name.length > 0 ? name : fallback;
}

export const formatPatrolHour = (hour: number): string => `${String(hour).padStart(2, '0')}:00`;

export const crossesMidnight = (window: CameraPatrolWindow): boolean => window.startHour > window.endHour;

export function parseDwell(text: string): number {
  const trimmed = text.trim();
  return /^\d{1,4}$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}
