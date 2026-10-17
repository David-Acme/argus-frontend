import { describe, expect, test } from 'bun:test';
import type { GuardEnvironment } from '@/core/types';
import {
  cameraEnvironmentIndex,
  camerasIn,
  environmentForCamera,
  maskedInScope,
  matchEnvironment,
  sharedMode,
  withCameraIn,
  withMode,
} from '@/features/security/model/environments';

const environment = (overrides: Partial<GuardEnvironment>): GuardEnvironment => ({
  id: 1,
  name: 'Casa',
  kind: 'home',
  isDefault: false,
  mode: 'home',
  effectiveMode: 'home',
  occupancy: 'manual',
  publicPresent: false,
  staffOnly: false,
  scheduleEnabled: false,
  asleep: '',
  open: '',
  staffed: '',
  closedMode: 'away',
  digestHour: 21,
  quietPolicy: 'inherit',
  quietStartHour: 22,
  quietEndHour: 7,
  cameraIds: [],
  maskedCameras: [],
  modeUpdatedAt: 0,
  updatedAt: 0,
  ...overrides,
});

const home = environment({ id: 1, name: 'Casa', isDefault: true, cameraIds: [2] });
const trattoria = environment({
  id: 2,
  name: 'Trattoria',
  kind: 'restaurant',
  scheduleEnabled: true,
  occupancy: 'open',
  publicPresent: true,
  cameraIds: [5],
});
const cottage = environment({ id: 3, name: 'Casa de campo', cameraIds: [7] });
const all = [home, trattoria, cottage];

describe('environments', () => {
  test('a camera belongs to the environment that lists it, else to the default', () => {
    expect(environmentForCamera(all, '5')?.name).toBe('Trattoria');
    expect(environmentForCamera(all, 9)?.name).toBe('Casa');
    expect(camerasIn(home, all, [{ id: '2' }, { id: '5' }, { id: '9' }]).map((camera) => camera.id)).toEqual([
      '2',
      '9',
    ]);
  });

  test('the camera index marks several environments and a guarded place', () => {
    const index = cameraEnvironmentIndex(withMode(all, 'away', 2), ['5', '9']);
    expect(index.get('5')).toMatchObject({ environmentId: 2, several: true, mode: 'away' });
    expect(index.get('9')?.name).toBe('Casa');
    expect(cameraEnvironmentIndex([home], ['9']).get('9')?.several).toBe(false);
  });

  test('a mode applies to one environment or to all, and open hours keep their posture', () => {
    const one = withMode(all, 'night', 3);
    expect(one.map((item) => item.mode)).toEqual(['home', 'home', 'night']);
    const every = withMode(all, 'away');
    expect(sharedMode(every)).toBe('away');
    expect(every[1]?.effectiveMode).toBe('home');
    expect(withMode(all, 'armed')[1]?.effectiveMode).toBe('armed');
    expect(sharedMode(one)).toBeNull();
  });

  test('moving a camera takes it out of every other environment', () => {
    const moved = withCameraIn(all, 5, 3);
    expect(moved[1]?.cameraIds).toEqual([]);
    expect(moved[2]?.cameraIds).toEqual([5, 7]);
  });

  test('a spoken place resolves by name, then by kind, and never guesses', () => {
    expect(matchEnvironment(all, 'trattoria')).toEqual({ kind: 'one', environment: trattoria });
    expect(matchEnvironment(all, 'restaurante')).toEqual({ kind: 'one', environment: trattoria });
    expect(matchEnvironment(all, 'casa campo')).toEqual({ kind: 'one', environment: cottage });
    expect(matchEnvironment(all, 'casa')).toEqual({ kind: 'one', environment: home });
    expect(matchEnvironment([trattoria, cottage, environment({ id: 4, name: 'Casa playa' })], 'casa')).toEqual({
      kind: 'unknown',
    });
    expect(matchEnvironment(all, 'oficina')).toEqual({ kind: 'unknown' });
    expect(matchEnvironment(all, 'me voy')).toEqual({ kind: 'all' });
    expect(matchEnvironment(all, '')).toEqual({ kind: 'all' });
    expect(matchEnvironment([home], 'oficina')).toEqual({ kind: 'all' });
  });
});

describe('maskedInScope', () => {
  const masked = (id: number, name: string) => ({ cameraId: id, name });

  test('a target environment answers only its own masked cameras', () => {
    const home = environment({ id: 1, maskedCameras: [masked(7, 'Gate')] });
    const shop = environment({ id: 2, maskedCameras: [masked(9, 'Till')] });
    expect(maskedInScope([home, shop], 1)).toEqual([masked(7, 'Gate')]);
    expect(maskedInScope([home, shop], 2)).toEqual([masked(9, 'Till')]);
  });

  test('no target asks every environment, one entry per camera', () => {
    const home = environment({ id: 1, maskedCameras: [masked(7, 'Gate'), masked(8, 'Yard')] });
    const shop = environment({ id: 2, maskedCameras: [masked(7, 'Gate'), masked(9, 'Till')] });
    expect(maskedInScope([home, shop])).toEqual([masked(7, 'Gate'), masked(8, 'Yard'), masked(9, 'Till')]);
  });

  test('nothing known is nothing masked', () => {
    expect(maskedInScope(null)).toEqual([]);
    expect(maskedInScope([])).toEqual([]);
    expect(maskedInScope(undefined, 3)).toEqual([]);
  });
});
