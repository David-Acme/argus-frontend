import { describe, expect, test } from 'bun:test';
import {
  agendaOnInicio,
  firstStep,
  isNewHousehold,
  sosOnInicio,
} from '@/features/home/model/inicio-states';
import { dayDetections, heroStats, statPlace } from '@/features/home/model/inicio-stats';

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
    expect(heroStats({ ...ALL, place: 'hero' })).toEqual([
      { kind: 'cameras', count: 5, icon: 'cam', href: '/security' },
      { kind: 'alerts', count: 0, icon: 'shieldok', href: '/security' },
      { kind: 'detections', count: 4, icon: 'hist', href: '/security' },
    ]);
  });

  test('the band shows cameras and alerts; the wide band adds detections and pending', () => {
    expect(heroStats({ ...ALL, place: 'band' }).map((stat) => stat.kind)).toEqual([
      'cameras',
      'alerts',
    ]);
    expect(heroStats({ ...ALL, place: 'wide' }).at(-1)).toEqual({
      kind: 'pending',
      count: 3,
      href: '/agenda',
    });
  });

  test('an alert today raises its stat with the alert glyph', () => {
    expect(heroStats({ ...ALL, alerts: 2, place: 'band' })[1]).toEqual({
      kind: 'alerts',
      count: 2,
      icon: 'alert',
      href: '/security',
      raised: true,
    });
  });

  test('a stat whose module is off or that the role cannot read is absent', () => {
    expect(
      heroStats({ cameras: null, alerts: null, detections: null, pending: 2, place: 'wide' })
    ).toEqual([{ kind: 'pending', count: 2, href: '/agenda' }]);
    expect(
      heroStats({ cameras: null, alerts: null, detections: null, pending: 2, place: 'hero' })
    ).toEqual([]);
  });

  test('phones and tablets carry the hero, desktop the band, and from 1700 px the wide band', () => {
    expect(statPlace('compact', 360)).toBe('hero');
    expect(statPlace('medium', 800)).toBe('hero');
    expect(statPlace('expanded', 1280)).toBe('band');
    expect(statPlace('wide', 1699)).toBe('band');
    expect(statPlace('wide', 1700)).toBe('wide');
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
    expect(firstStep({ summary: EMPTY, addsCameras: false, addsReminders: true })).toBe('reminder');
    expect(firstStep({ summary: EMPTY, addsCameras: false, addsReminders: false })).toBeNull();
  });

  test('a household with data has no first step', () => {
    expect(
      firstStep({
        summary: { ...EMPTY, remindersPending: 2 },
        addsCameras: true,
        addsReminders: true,
      })
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

describe('the agenda on Inicio', () => {
  test('it belongs to Productividad: off, the lines go even for a role that reads reminders', () => {
    expect(agendaOnInicio({ productivity: true, reminders: true, agenda: true })).toBe(true);
    expect(agendaOnInicio({ productivity: true, reminders: true, agenda: false })).toBe(true);
    expect(agendaOnInicio({ productivity: false, reminders: true, agenda: false })).toBe(false);
    expect(agendaOnInicio({ productivity: true, reminders: false, agenda: false })).toBe(false);
  });
});
