import { describe, expect, test } from 'bun:test';
import type { CameraAim } from '@/core/types';
import {
  NO_AIM_SECTOR_MAX,
  aimSettingsOf,
  closeSector,
  homePresetOf,
  leaseView,
  sectorProblem,
  sectorRange,
  sightActivity,
  withAimPatch,
} from '@/features/cameras/model/camera-aim';

function aim(overrides: Partial<CameraAim> = {}): CameraAim {
  return {
    cameraId: 4,
    ptz: true,
    homePreset: '2',
    atHome: true,
    pan: 0,
    tilt: 0,
    lease: { holder: 'none', userId: 0, mine: false, sinceMs: 0, parkUntilMs: 0 },
    activity: 'idle',
    settings: { activeLook: true, followIntruders: false, noAimSectors: [] },
    wear: { movesToday: 3, dailyCap: 400 },
    ...overrides,
  };
}

describe('the lease the app shows', () => {
  test('nobody holding the camera shows nothing', () => {
    expect(leaseView(null)).toBe('free');
    expect(leaseView(aim())).toBe('free');
  });

  test('my own lease wins over the holder kind', () => {
    expect(leaseView(aim({ lease: { holder: 'person', userId: 7, mine: true, sinceMs: 1, parkUntilMs: 0 } }))).toBe('mine');
    expect(leaseView(aim({ lease: { holder: 'viewer', userId: 7, mine: true, sinceMs: 1, parkUntilMs: 0 } }))).toBe('mine');
  });

  test('Argus and other people read apart', () => {
    expect(leaseView(aim({ lease: { holder: 'argus', userId: 0, mine: false, sinceMs: 1, parkUntilMs: 0 } }))).toBe('argus');
    expect(leaseView(aim({ lease: { holder: 'person', userId: 9, mine: false, sinceMs: 1, parkUntilMs: 0 } }))).toBe('other');
    expect(leaseView(aim({ lease: { holder: 'viewer', userId: 9, mine: false, sinceMs: 1, parkUntilMs: 0 } }))).toBe('other');
  });
});

describe('the "Argus está mirando" indicator', () => {
  test('looking, following and patrolling all read as watching', () => {
    for (const activity of ['looking', 'following', 'patrolling'] as const) {
      expect(sightActivity(aim({ activity }))).toBe('watching');
    }
  });

  test('returning has its own label and idle shows nothing', () => {
    expect(sightActivity(aim({ activity: 'returning' }))).toBe('returning');
    expect(sightActivity(aim({ activity: 'idle' }))).toBeNull();
    expect(sightActivity(null)).toBeNull();
  });
});

describe('settings paint from the synced row first', () => {
  const synced = {
    homePreset: '5',
    activeLook: false,
    followIntruders: true,
    noAimSectors: [{ name: 'Vecino', panFrom: -20, panTo: 10, tiltFrom: 0, tiltTo: 15 }],
  };

  test('without an answer from the camera the row decides', () => {
    expect(aimSettingsOf(null, synced)).toEqual({
      activeLook: false,
      followIntruders: true,
      noAimSectors: synced.noAimSectors,
    });
    expect(homePresetOf(null, synced)).toBe('5');
  });

  test('the camera answer replaces the row once it arrives', () => {
    expect(aimSettingsOf(aim(), synced).activeLook).toBe(true);
    expect(homePresetOf(aim({ homePreset: null }), synced)).toBeNull();
  });

  test('with neither, every toggle is off', () => {
    expect(aimSettingsOf(null, undefined)).toEqual({
      activeLook: false,
      followIntruders: false,
      noAimSectors: [],
    });
    expect(homePresetOf(null, undefined)).toBeNull();
  });

  test('an optimistic patch touches only the settings', () => {
    const before = aim();
    const after = withAimPatch(before, { followIntruders: true });
    expect(after?.settings.followIntruders).toBe(true);
    expect(after?.settings.activeLook).toBe(true);
    expect(after?.lease).toBe(before.lease);
    expect(withAimPatch(null, { followIntruders: true })).toBeNull();
  });
});

describe('no-aim sectors', () => {
  test('marking the end before the start still orders the range', () => {
    expect(closeSector({ pan: 30.04, tilt: 12 }, { pan: -15, tilt: -4.26 }, '  Vecino ')).toEqual({
      name: 'Vecino',
      panFrom: -15,
      panTo: 30,
      tiltFrom: -4.3,
      tiltTo: 12,
    });
  });

  test('the server limits are checked before saving', () => {
    const ok = { name: 'Ventana', panFrom: -10, panTo: 10, tiltFrom: -5, tiltTo: 5 };
    expect(sectorProblem([ok])).toBeNull();
    expect(sectorProblem([{ ...ok, name: ' ' }])).toBe('name');
    expect(sectorProblem([{ ...ok, name: 'x'.repeat(41) }])).toBe('name');
    expect(sectorProblem([{ ...ok, panTo: 181 }])).toBe('pan');
    expect(sectorProblem([{ ...ok, tiltFrom: -91 }])).toBe('tilt');
    expect(sectorProblem([{ ...ok, panFrom: 20 }])).toBe('order');
    expect(sectorProblem(Array.from({ length: NO_AIM_SECTOR_MAX + 1 }, () => ok))).toBe('too-many');
  });

  test('a sector reads as its pan and tilt ranges', () => {
    expect(sectorRange({ name: 'a', panFrom: -10, panTo: 20.5, tiltFrom: 0, tiltTo: 5 })).toBe('-10° – 20.5° · 0° – 5°');
  });
});
