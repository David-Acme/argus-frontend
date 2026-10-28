import { describe, expect, test } from 'bun:test';
import {
  clipsToday,
  recordingsLineOf,
  settingsSectionsOf,
  settingsSummaryOf,
  zoneNames,
} from '@/features/cameras/model/camera-settings';
import { startOfLocalDay } from '@/shared/libs/day';

const full = { ptz: true, presets: true, privacy: true, motion: true, autoTrack: false };

describe('the sections of Ajustes de la cámara', () => {
  test('an owner on a pan-tilt camera gets every section in order', () => {
    expect(
      settingsSectionsOf({
        features: full,
        update: true,
        remove: true,
        aim: true,
        maintenance: true,
      })
    ).toEqual([
      'privacy',
      'detection',
      'listen',
      'gaze',
      'patrol',
      'places',
      'maintenance',
      'device',
      'advanced',
    ]);
  });

  test('a role that cannot change the camera reads listening and the device only', () => {
    expect(
      settingsSectionsOf({
        features: full,
        update: false,
        remove: false,
        aim: false,
        maintenance: false,
      })
    ).toEqual(['listen', 'device']);
  });

  test('a fixed camera has no gaze, patrol or places', () => {
    const sections = settingsSectionsOf({
      features: { privacy: false, motion: false },
      update: true,
      remove: false,
      aim: true,
      maintenance: true,
    });
    expect(sections).toEqual(['listen', 'maintenance', 'device', 'advanced']);
    expect(settingsSummaryOf(sections)).toBe('screens.cameras.rows.settings-plain');
  });

  test('the row summary names what is there', () => {
    expect(settingsSummaryOf(['privacy', 'patrol'])).toBe('screens.cameras.rows.settings-patrol');
    expect(settingsSummaryOf(['privacy', 'listen'])).toBe('screens.cameras.rows.settings-privacy');
  });
});

describe('the live rows', () => {
  test('recordings count those since local midnight', () => {
    const now = new Date(2026, 9, 26, 15, 0).getTime();
    const midnight = startOfLocalDay(now) / 1000;
    expect(
      clipsToday(
        [{ startedAt: midnight + 10 }, { startedAt: midnight - 10 }, { startedAt: midnight }],
        now
      )
    ).toBe(2);
  });

  test('zones list the active ones by name', () => {
    expect(
      zoneNames([
        { name: 'Jardín', isEnabled: true },
        { name: 'Calle', isEnabled: false },
        { name: 'Ventana del vecino', isEnabled: true },
        { name: 'Zona 10', isEnabled: true },
        { name: 'Zona 2', isEnabled: true },
      ])
    ).toEqual(['Jardín', 'Ventana del vecino', 'Zona 2', 'Zona 10']);
  });
});

describe('the recordings row says why when it has no count', () => {
  const base = {
    recordMode: 'events',
    masked: false,
    enabled: true,
    status: 'ready',
    hasClips: false,
  } as const;

  test('known clips are counted whatever else holds', () => {
    expect(recordingsLineOf({ ...base, masked: true, hasClips: true })).toBe('count');
    expect(recordingsLineOf(base)).toBe('count');
  });

  test('without clips it names the reason in order', () => {
    expect(recordingsLineOf({ ...base, recordMode: 'off' })).toBe('off');
    expect(recordingsLineOf({ ...base, masked: true, status: 'failed' })).toBe('private');
    expect(recordingsLineOf({ ...base, enabled: false, status: 'failed' })).toBe('paused');
    expect(recordingsLineOf({ ...base, status: 'failed' })).toBe('unread');
    expect(recordingsLineOf({ ...base, status: 'loading' })).toBe('reading');
  });
});
