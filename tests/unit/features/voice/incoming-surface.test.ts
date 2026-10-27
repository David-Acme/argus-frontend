import { describe, expect, test } from 'bun:test';
import {
  callKindOf,
  callReminderIdOf,
  callSubjectOf,
  ringChoices,
  ringSurfaceOf,
} from '@/features/voice/model/incoming-surface';

describe('which ring surface the app shows', () => {
  test('a reminder rings as the top banner on any screen but the call screen', () => {
    expect(ringSurfaceOf({ waiting: { urgency: 'active' }, pathname: '/' })).toBe('banner');
    expect(ringSurfaceOf({ waiting: { urgency: 'time_sensitive' }, pathname: '/cameras' })).toBe(
      'banner'
    );
    expect(ringSurfaceOf({ waiting: { urgency: 'active' }, pathname: '/call' })).toBe('none');
  });

  test('an alert at home takes the full screen', () => {
    expect(ringSurfaceOf({ waiting: { urgency: 'critical' }, pathname: '/agenda' })).toBe('full');
    expect(ringSurfaceOf({ waiting: { urgency: 'critical' }, pathname: '/call' })).toBe('none');
  });

  test('without a held ring nothing is shown', () => {
    expect(ringSurfaceOf({ waiting: null, pathname: '/' })).toBe('none');
  });

  test('only a critical ring is an alert', () => {
    expect(callKindOf('critical')).toBe('alert');
    expect(callKindOf('time_sensitive')).toBe('reminder');
    expect(callKindOf('active')).toBe('reminder');
    expect(callKindOf(undefined)).toBe('reminder');
  });
});

describe('the ring buttons', () => {
  test('a reminder offers En 10 min between decline and answer only when it can be snoozed', () => {
    expect(ringChoices({ kind: 'reminder', snoozable: true })).toEqual([
      'decline',
      'snooze',
      'answer',
    ]);
    expect(ringChoices({ kind: 'reminder', snoozable: false })).toEqual(['decline', 'answer']);
  });

  test('an alert never offers a snooze', () => {
    expect(ringChoices({ kind: 'alert', snoozable: true })).toEqual(['decline', 'answer']);
  });

  test('a call can act on a reminder only when it is a reminder call that names one', () => {
    expect(callReminderIdOf({ category: 'reminder', urgency: 'active', reminderId: 77 })).toBe(77);
    expect(
      callReminderIdOf({ category: 'reminder', urgency: 'active', reminderId: null })
    ).toBeNull();
    expect(callReminderIdOf({ category: 'reminder', urgency: 'active', reminderId: 0 })).toBeNull();
    expect(
      callReminderIdOf({ category: 'reminder', urgency: 'active', reminderId: 1.5 })
    ).toBeNull();
    expect(
      callReminderIdOf({ category: 'reminder', urgency: 'active', reminderId: '77' })
    ).toBeNull();
    expect(callReminderIdOf({ category: 'notice', urgency: 'active', reminderId: 77 })).toBeNull();
    expect(callReminderIdOf({ category: 'alert', urgency: 'critical', reminderId: 77 })).toBeNull();
    expect(
      callReminderIdOf({ category: 'reminder', urgency: 'critical', reminderId: 77 })
    ).toBeNull();
    expect(callReminderIdOf({ urgency: 'active', reminderId: 77 })).toBeNull();
  });

  test('the subject names the call, falling back to its reason', () => {
    expect(callSubjectOf({ reason: 'Recordatorio', subject: ' Pagar la luz ' })).toBe(
      'Pagar la luz'
    );
    expect(callSubjectOf({ reason: 'Hay alguien en el patio', subject: null })).toBe(
      'Hay alguien en el patio'
    );
    expect(callSubjectOf({ reason: 'Agenda', subject: '  ' })).toBe('Agenda');
  });
});
