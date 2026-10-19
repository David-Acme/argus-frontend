import { describe, expect, test } from 'bun:test';
import type { MaintenanceWindow } from '@/core/types';
import {
  MAINTENANCE_MAX_MINUTES,
  activeWindowFor,
  cameraNames,
  declareBody,
  minutesLeft,
  pendingChecks,
  replaceWindow,
  sortWindows,
  windowsForCamera,
} from '@/features/security/model/maintenance';

function window(overrides: Partial<MaintenanceWindow> & Pick<MaintenanceWindow, 'id'>): MaintenanceWindow {
  return {
    environmentId: 1,
    cameraIds: [4],
    declaredBy: 7,
    declaredByName: 'Ana',
    startedAt: 1000,
    endsAt: 1900,
    endedAt: null,
    endReason: null,
    active: true,
    duress: false,
    source: 'app',
    viewChecks: [],
    ...overrides,
  };
}

describe('declaring maintenance', () => {
  test('cameras are deduplicated and the minutes bounded', () => {
    expect(declareBody({ kind: 'cameras', cameraIds: [4, 4, 5, 0] }, 15)).toEqual({ cameraIds: [4, 5], minutes: 15 });
    expect(declareBody({ kind: 'cameras', cameraIds: [4] }, 500)).toEqual({ cameraIds: [4], minutes: MAINTENANCE_MAX_MINUTES });
    expect(declareBody({ kind: 'cameras', cameraIds: [4] }, 0)).toEqual({ cameraIds: [4], minutes: 1 });
  });

  test('a whole environment is sent by its id', () => {
    expect(declareBody({ kind: 'environment', environmentId: 2 }, 30)).toEqual({ environmentId: 2, minutes: 30 });
  });

  test('nothing chosen sends nothing', () => {
    expect(declareBody({ kind: 'cameras', cameraIds: [] }, 15)).toBeNull();
    expect(declareBody({ kind: 'environment', environmentId: 0 }, 15)).toBeNull();
  });
});

describe('the windows list', () => {
  test('active windows come first, newest first within each group', () => {
    const sorted = sortWindows([
      window({ id: 1, active: false, startedAt: 3000 }),
      window({ id: 2, startedAt: 1000 }),
      window({ id: 3, startedAt: 2000 }),
    ]);
    expect(sorted.map((item) => item.id)).toEqual([3, 2, 1]);
  });

  test('a camera sees only the windows that cover it', () => {
    const windows = [window({ id: 1, cameraIds: [4, 5] }), window({ id: 2, cameraIds: [6] })];
    expect(windowsForCamera(windows, 5).map((item) => item.id)).toEqual([1]);
    expect(activeWindowFor(windows, 6)?.id).toBe(2);
    expect(activeWindowFor(windows, 9)).toBeNull();
  });

  test('an answer replaces its window and a new one goes on top', () => {
    const windows = [window({ id: 1 })];
    expect(replaceWindow(windows, window({ id: 1, active: false }))[0]?.active).toBe(false);
    expect(replaceWindow(windows, window({ id: 2 })).map((item) => item.id)).toEqual([2, 1]);
  });

  test('minutes left round up and never go below zero', () => {
    expect(minutesLeft({ endsAt: 1900 }, 1000)).toBe(15);
    expect(minutesLeft({ endsAt: 1900 }, 1850)).toBe(1);
    expect(minutesLeft({ endsAt: 1900 }, 2000)).toBe(0);
  });

  test('only the person who declared the window is asked about the new view', () => {
    const asked = window({
      id: 1,
      viewChecks: [
        { cameraId: 4, cameraName: 'Patio', state: 'pending' },
        { cameraId: 5, cameraName: 'Sala', state: 'accepted' },
      ],
    });
    expect(pendingChecks(asked, 7).map((check) => check.cameraId)).toEqual([4]);
    expect(pendingChecks(asked, 8)).toEqual([]);
  });

  test('unknown cameras are named by their id', () => {
    expect(cameraNames(window({ id: 1, cameraIds: [4, 9] }), new Map([[4, 'Patio']]))).toEqual(['Patio', '#9']);
  });
});
