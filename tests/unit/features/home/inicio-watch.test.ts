import { describe, expect, test } from 'bun:test';
import { helpRows, tryPhrases } from '@/features/home/model/inicio-guide';
import { isSparse, systemRows } from '@/features/home/model/inicio-system';
import { wakeRuleOf, watchedCameras, watchTitleOf } from '@/features/home/model/inicio-watch';

const CAMERAS = [
  { id: '1', name: 'Puerta' },
  { id: '2', name: 'Garaje' },
  { id: '3', name: 'Patio trasero' },
  { id: '4', name: 'Sala' },
  { id: '5', name: 'Cocina' },
];

const SUMMARY = {
  camerasTotal: 0,
  camerasOnline: 0,
  projectsActive: 0,
  tasksOpen: 0,
};

describe('what Argus watches tonight', () => {
  test('the cameras of every place not at home, named in the camera list order', () => {
    expect(
      watchedCameras({
        environments: [
          { effectiveMode: 'night', cameraIds: [3, 1] },
          { effectiveMode: 'home', cameraIds: [4] },
        ],
        cameras: CAMERAS,
        shown: 3,
      })
    ).toEqual({ count: 2, names: ['Puerta', 'Patio trasero'], more: 0 });
  });

  test('past the shown names the rest is a count', () => {
    expect(
      watchedCameras({
        environments: [{ effectiveMode: 'away', cameraIds: [1, 2, 3, 4, 5] }],
        cameras: CAMERAS,
        shown: 3,
      })
    ).toEqual({ count: 5, names: ['Puerta', 'Garaje', 'Patio trasero'], more: 2 });
  });

  test('nothing watched, or a camera the list does not know, is no section', () => {
    expect(
      watchedCameras({
        environments: [{ effectiveMode: 'home', cameraIds: [1] }],
        cameras: CAMERAS,
        shown: 3,
      })
    ).toBeNull();
    expect(
      watchedCameras({
        environments: [{ effectiveMode: 'night', cameraIds: [9] }],
        cameras: CAMERAS,
        shown: 3,
      })
    ).toBeNull();
  });

  test('each mode says when Argus wakes you, and home says nothing', () => {
    expect(wakeRuleOf('night')).toBe('unknown');
    expect(wakeRuleOf('away')).toBe('insists');
    expect(wakeRuleOf('armed')).toBe('danger');
    expect(wakeRuleOf('home')).toBeNull();
    expect(wakeRuleOf(null)).toBeNull();
  });

  test('night is «Esta noche», away and armed are «Mientras no estás»', () => {
    expect(watchTitleOf('night')).toBe('tonight');
    expect(watchTitleOf('away')).toBe('away');
    expect(watchTitleOf('armed')).toBe('away');
    expect(watchTitleOf('home')).toBeNull();
  });
});

describe('the system status', () => {
  test('the active modules and the cameras online, each only when readable', () => {
    expect(
      systemRows({
        modules: ['Vigilancia', 'Productividad'],
        cameras: { camerasOnline: 5, camerasTotal: 6 },
      })
    ).toEqual([
      { kind: 'modules', names: ['Vigilancia', 'Productividad'] },
      { kind: 'cameras', online: 5, total: 6 },
    ]);
    expect(systemRows({ modules: [], cameras: { camerasOnline: 0, camerasTotal: 0 } })).toEqual([
      { kind: 'no-cameras' },
    ]);
    expect(systemRows({ modules: null, cameras: null })).toEqual([]);
  });

  test('a home with nothing pending is sparse', () => {
    expect(isSparse(SUMMARY)).toBe(true);
    expect(isSparse({ ...SUMMARY, camerasTotal: 3 })).toBe(true);
    expect(isSparse({ ...SUMMARY, tasksOpen: 1 })).toBe(false);
  });
});

describe('the guide for a home with little data', () => {
  test('Argus says how it helps only with what the reader has', () => {
    expect(helpRows({ cameras: true, reminders: true, voice: true })).toEqual([
      'guards',
      'reminds',
      'answers',
    ]);
    expect(helpRows({ cameras: false, reminders: true, voice: false })).toEqual(['reminds']);
  });

  test('what to say follows the rights behind each answer', () => {
    expect(tryPhrases({ events: true, presence: true, setsMode: true, agenda: true })).toEqual([
      'who-home',
      'night',
      'happened',
      'today',
    ]);
    expect(tryPhrases({ events: false, presence: false, setsMode: false, agenda: true })).toEqual([
      'today',
    ]);
  });
});
