import { describe, expect, test } from 'bun:test';
import { firstStep, isNewHousehold, sosOnInicio } from '@/features/home/model/inicio-states';
import { dayDetections, heroStats } from '@/features/home/model/inicio-stats';

const ALL = { cameras: 5, alerts: 0, detections: 4, pending: 3 };

const EMPTY = {
  camerasTotal: 0,
  camerasOnline: 0,
  remindersPending: 0,
  projectsActive: 0,
  tasksOpen: 0,
};

describe('the hero stats', () => {
  test('a phone shows cameras, alerts today and detections, each opening Seguridad', () => {
    expect(heroStats({ ...ALL, wide: false })).toEqual([
      { kind: 'cameras', count: 5, icon: 'cam', href: '/security' },
      { kind: 'alerts', count: 0, icon: 'shieldok', href: '/security' },
      { kind: 'detections', count: 4, icon: 'hist', href: '/security' },
    ]);
  });

  test('the wide band adds the pending count, opening Agenda', () => {
    expect(heroStats({ ...ALL, wide: true }).at(-1)).toEqual({
      kind: 'pending',
      count: 3,
      href: '/agenda',
    });
  });

  test('a stat whose module is off or that the role cannot read is absent', () => {
    expect(
      heroStats({ cameras: null, alerts: null, detections: null, pending: 2, wide: true })
    ).toEqual([{ kind: 'pending', count: 2, href: '/agenda' }]);
    expect(
      heroStats({ cameras: null, alerts: null, detections: null, pending: null, wide: true })
    ).toEqual([]);
  });
});

describe('the detections of the day', () => {
  test('only today counts, and an alert is anything above info', () => {
    const midnight = 1_000_000;
    const events = [
      { at: midnight + 1, severity: 'info' },
      { at: midnight + 2, severity: 'warning' },
      { at: midnight + 3, severity: 'critical' },
      { at: midnight - 1, severity: 'critical' },
    ];
    expect(dayDetections(events, midnight)).toEqual({ detections: 3, alerts: 2 });
  });
});

describe('the new household', () => {
  test('a home with nothing yet is new; any camera or pending item is not', () => {
    expect(isNewHousehold(EMPTY)).toBe(true);
    expect(isNewHousehold({ ...EMPTY, camerasTotal: 1 })).toBe(false);
    expect(isNewHousehold({ ...EMPTY, tasksOpen: 1 })).toBe(false);
  });

  test('the one first step is the camera when cameras can be added, else the reminder', () => {
    expect(firstStep({ summary: EMPTY, addsCameras: true, addsReminders: true })).toBe('camera');
    expect(firstStep({ summary: EMPTY, addsCameras: false, addsReminders: true })).toBe(
      'reminder'
    );
    expect(firstStep({ summary: EMPTY, addsCameras: false, addsReminders: false })).toBeNull();
  });

  test('a household with data has no first step', () => {
    expect(
      firstStep({ summary: { ...EMPTY, remindersPending: 2 }, addsCameras: true, addsReminders: true })
    ).toBeNull();
  });
});

describe('the SOS on Inicio', () => {
  test('a role that can panic and has no Seguridad tab holds its SOS on Inicio', () => {
    expect(sosOnInicio({ panics: true, hasSecurityTab: false })).toBe(true);
    expect(sosOnInicio({ panics: true, hasSecurityTab: true })).toBe(false);
    expect(sosOnInicio({ panics: false, hasSecurityTab: false })).toBe(false);
  });
});
