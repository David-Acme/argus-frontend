import { describe, expect, test } from 'bun:test';
import { readIncidentResponse } from '@/core/contracts/response.contract';
import type { IncidentResponse } from '@/core/types';
import { CAPABILITY } from '@/shared/constants';
import {
  alertsFor,
  canDecide,
  contactsOf,
  emergencyOf,
  headlineOf,
  mergeResponse,
  phoneHref,
  placeOf,
  toneOf,
  visibleResponses,
  withVerdict,
} from '@/features/response/model/response';
import { accessFor, viewFor } from '@tests/support/access-fixtures';
import { accessView } from '@/shared/libs/capabilities';

const base: IncidentResponse = {
  id: 7,
  threadKey: 'guard:episode:41',
  kind: 'guard_episode',
  environmentId: 1,
  environmentName: 'Casa',
  cameraId: 6,
  cameraName: 'Patio',
  episodeId: 41,
  strategy: 'ordered',
  state: 'active',
  step: 0,
  stepCount: 3,
  attendedBy: null,
  verdict: '',
  verdictBy: null,
  verdictAt: 0,
  emergencyNumber: '105',
  contacts: [{ name: 'Vecina', phone: '+51 999 111 222', note: '' }],
  showContacts: false,
  offers: ['camera'],
  createdAt: 1000,
  updatedAt: 1000,
  mine: { step: 0, mode: 'call', mandatory: false, discreet: false, reached: true },
};

describe('response headline', () => {
  test('an active response says which step is calling', () => {
    expect(headlineOf(base, 1)).toEqual({ key: 'calling', step: 1, stepCount: 3 });
  });

  test('the person attending is named, and the attendant reads it as themselves', () => {
    const attended = { ...base, state: 'attended' as const, attendedBy: { userId: 2, name: 'Pedro' } };
    expect(headlineOf(attended, 1)).toEqual({ key: 'attended', name: 'Pedro' });
    expect(headlineOf(attended, 2)).toEqual({ key: 'attended-self' });
    expect(toneOf(attended)).toBe('attended');
  });

  test('verdicts and endings read as what they are', () => {
    expect(headlineOf({ ...base, state: 'false_alarm', verdictBy: { userId: 3, name: 'Ana' } }, 1)).toEqual({
      key: 'false-alarm',
      name: 'Ana',
    });
    expect(headlineOf({ ...base, state: 'false_alarm', verdictBy: { userId: 3, name: 'Ana' } }, 3)).toEqual({
      key: 'false-alarm-self',
    });
    expect(headlineOf({ ...base, state: 'confirmed', verdictBy: { userId: 1, name: 'Laura' } }, 1)).toEqual({
      key: 'confirmed-self',
    });
    expect(headlineOf({ ...base, state: 'unanswered' }, 1)).toEqual({ key: 'unanswered' });
    expect(toneOf({ ...base, state: 'expired' })).toBe('resolved');
    expect(toneOf({ ...base, state: 'confirmed' })).toBe('confirmed');
  });
});

describe('response verdict', () => {
  test('only someone the response reached may decide, and a false alarm closes it', () => {
    expect(canDecide(base, 'real')).toBe(true);
    expect(canDecide({ ...base, mine: null }, 'false_alarm')).toBe(false);
    expect(canDecide({ ...base, mine: { ...base.mine!, reached: false } }, 'real')).toBe(false);
    expect(canDecide({ ...base, state: 'false_alarm' }, 'real')).toBe(false);
    expect(canDecide({ ...base, state: 'confirmed' }, 'real')).toBe(false);
    expect(canDecide({ ...base, state: 'confirmed' }, 'false_alarm')).toBe(true);
  });

  test('an optimistic verdict keeps the server clock so the answer still lands', () => {
    const decided = withVerdict(base, 'real', { userId: 1, name: 'Laura' }, 5000);
    expect(decided.state).toBe('confirmed');
    expect(decided.verdictBy).toEqual({ userId: 1, name: 'Laura' });
    expect(decided.attendedBy).toEqual({ userId: 1, name: 'Laura' });
    expect(decided.showContacts).toBe(true);
    expect(decided.updatedAt).toBe(base.updatedAt);
    const fromServer = { ...decided, updatedAt: 1001, verdictAt: 1001 };
    expect(mergeResponse({ 7: decided }, fromServer)[7]).toBe(fromServer);
  });

  test('an older frame never overwrites a newer state', () => {
    const newer = { ...base, state: 'attended' as const, updatedAt: 2000 };
    expect(mergeResponse({ 7: newer }, base)[7]).toBe(newer);
  });
});

describe('contacts and the emergency number', () => {
  test('they appear only when the server says to show them', () => {
    expect(contactsOf(base)).toEqual([]);
    expect(emergencyOf(base)).toBeNull();
    const shown = { ...base, showContacts: true };
    expect(contactsOf(shown)).toHaveLength(1);
    expect(emergencyOf(shown)).toBe('105');
    expect(emergencyOf({ ...shown, emergencyNumber: '' })).toBeNull();
  });

  test('phone links keep only dialable characters', () => {
    expect(phoneHref('+51 (999) 111-222', 'tel')).toBe('tel:+51999111222');
    expect(phoneHref('105', 'sms')).toBe('sms:105');
  });

  test('the place names the camera and its environment', () => {
    expect(placeOf(base)).toBe('Patio (Casa)');
    expect(placeOf({ ...base, cameraName: '' })).toBe('Casa');
  });
});

describe('visible responses', () => {
  test('open ones first, closed ones linger fifteen minutes', () => {
    const open = { ...base, id: 1, createdAt: 100 };
    const closed = { ...base, id: 2, state: 'false_alarm' as const, createdAt: 200, updatedAt: 1000 };
    const old = { ...base, id: 3, state: 'expired' as const, updatedAt: 0 };
    const visible = visibleResponses({ 1: open, 2: closed, 3: old }, 1000 + 60);
    expect(visible.map((item) => item.id)).toEqual([1, 2]);
    expect(visibleResponses({ 2: closed }, 1000 + 16 * 60)).toEqual([]);
  });
});

describe('response contract', () => {
  test('a response_update frame parses, and a malformed one is refused', () => {
    expect(readIncidentResponse(base)).toEqual(base);
    expect(readIncidentResponse({ ...base, state: 'ringing' })).toBeNull();
    expect(readIncidentResponse({ ...base, mine: undefined })).toBeNull();
  });
});

describe('the alert strip follows safety.respond and the alerts addressed to the user', () => {
  const panic: IncidentResponse = { ...base, id: 9, kind: 'guard_panic', cameraId: 0, state: 'active' };
  const NOW = 1000;
  const alerts = { [panic.id]: panic };

  test('an inactive guard with a live alert sees it', () => {
    const guard = viewFor('guard', { modules: ['productivity'] });
    expect(guard.roleActive).toBe(false);
    expect(alertsFor(guard, alerts, NOW).map((alert) => alert.id)).toEqual([9]);
  });

  test('a user with no alert sees no strip, whatever the role state', () => {
    expect(alertsFor(viewFor('guard', { modules: ['productivity'] }), {}, NOW)).toEqual([]);
    expect(alertsFor(viewFor('resident'), {}, NOW)).toEqual([]);
  });

  test('a resident with surveillance off still sees the alert raised for them', () => {
    const resident = viewFor('resident', { modules: [] });
    expect(resident.roleActive).toBe(true);
    expect(resident.capabilities.has(CAPABILITY.guardRead)).toBe(false);
    expect(alertsFor(resident, alerts, NOW).map((alert) => alert.id)).toEqual([9]);
  });

  test('every role that holds safety.respond sees it, owner included', () => {
    for (const role of ['owner', 'resident', 'guard', 'guest'] as const) {
      expect(alertsFor(viewFor(role), alerts, NOW)).toHaveLength(1);
    }
  });

  test('without safety.respond nothing is shown, and a role this build does not know holds nothing', () => {
    const stripped = viewFor('guard');
    const without = { ...stripped, capabilities: new Set([...stripped.capabilities].filter((id) => id !== CAPABILITY.safetyRespond)) };
    expect(alertsFor(without, alerts, NOW)).toEqual([]);
    const unknown = accessView({ ...accessFor('guest'), role: null, roleActive: false, capabilities: [] }, 'guest');
    expect(alertsFor(unknown, alerts, NOW)).toEqual([]);
  });

  test('a closed alert fades from the strip after fifteen minutes and an open one never does', () => {
    const closed = { ...panic, id: 10, state: 'false_alarm' as const, updatedAt: NOW };
    const open = { ...panic, id: 11, state: 'attended' as const, updatedAt: NOW };
    const view = viewFor('guard', { modules: [] });
    const later = NOW + 16 * 60;
    expect(alertsFor(view, { 10: closed, 11: open }, NOW + 60).map((alert) => alert.id)).toEqual([11, 10]);
    expect(alertsFor(view, { 10: closed, 11: open }, later).map((alert) => alert.id)).toEqual([11]);
  });
});
