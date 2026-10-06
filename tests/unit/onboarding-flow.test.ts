import { describe, expect, test } from 'bun:test';
import {
  signalsKnownAt,
  enrollModeOf,
  flowOf,
  hrefOf,
  isSkippable,
  nextHref,
  ONBOARDING_FLOWS,
  progressOf,
  stepsOf,
} from '@/features/auth/model/onboarding-flow';

const phone = { native: true };
const desktop = { native: false };

describe('onboarding flows are data', () => {
  test('a new owner pairs, consents, enrols, chooses modules, answers for them and meets Argus', () => {
    expect(ONBOARDING_FLOWS.owner.map((step) => step.id)).toEqual([
      'pair',
      'privacy',
      'face',
      'modules',
      'module-privacy',
      'meet',
    ]);
    expect(progressOf('owner', 'pair', phone)).toMatchObject({ current: 1, total: 6 });
    expect(progressOf('owner', 'modules', phone)).toMatchObject({ current: 4, total: 6 });
    expect(progressOf('owner', 'module-privacy', phone)).toMatchObject({ current: 5, total: 6 });
  });

  test('consent comes before the face and the module answers after the modules', () => {
    const ids = ONBOARDING_FLOWS.owner.map((step) => step.id);
    expect(ids.indexOf('privacy')).toBeLessThan(ids.indexOf('face'));
    expect(ids.indexOf('face')).toBeLessThan(ids.indexOf('modules'));
    expect(ids.indexOf('modules')).toBeLessThan(ids.indexOf('module-privacy'));
  });

  test('the module answers drop out, and the count with them, when no chosen module has signals', () => {
    const none = { native: true, moduleSignals: false };
    const some = { native: true, moduleSignals: true };
    expect(stepsOf('owner', none).map((step) => step.id)).toEqual(['pair', 'privacy', 'face', 'modules', 'meet']);
    expect(stepsOf('owner', some)).toHaveLength(6);
    expect(progressOf('owner', 'meet', none)).toMatchObject({ current: 5, total: 5 });
    expect(progressOf('owner', 'meet', some)).toMatchObject({ current: 6, total: 6 });
    expect(nextHref('owner', 'modules', none)).toEqual({ pathname: '/welcome/voice', params: { flow: 'owner' } });
    expect(nextHref('owner', 'modules', some)).toEqual({ pathname: '/welcome/module-privacy', params: { flow: 'owner' } });
    expect(nextHref('owner', 'module-privacy', some)).toEqual({ pathname: '/welcome/voice', params: { flow: 'owner' } });
  });

  test('until the modules are chosen the count assumes the step', () => {
    expect(progressOf('owner', 'privacy', { native: true, moduleSignals: null })).toMatchObject({ current: 2, total: 6 });
    expect(signalsKnownAt('owner', 'face')).toBe(false);
    expect(signalsKnownAt('owner', 'modules')).toBe(false);
    expect(signalsKnownAt('owner', 'module-privacy')).toBe(true);
    expect(signalsKnownAt('owner', 'meet')).toBe(true);
    expect(signalsKnownAt('invited', 'meet')).toBe(false);
  });

  test('the module answers are never part of the desktop or invited flows', () => {
    expect(stepsOf('owner', desktop).map((step) => step.id)).toEqual(['pair']);
    expect(ONBOARDING_FLOWS.invited.map((step) => step.id)).not.toContain('module-privacy');
  });

  test('an invited person never chooses modules', () => {
    expect(ONBOARDING_FLOWS.invited.map((step) => step.id)).toEqual(['invitation', 'privacy', 'face', 'meet']);
    expect(progressOf('invited', 'face', phone)).toMatchObject({ current: 3, total: 4 });
    expect(progressOf('invited', 'modules', phone)).toBeNull();
  });

  test('the desktop only pairs, so it shows no stepper', () => {
    expect(stepsOf('owner', desktop).map((step) => step.id)).toEqual(['pair']);
    expect(progressOf('owner', 'pair', desktop)).toBeNull();
    expect(nextHref('owner', 'pair', desktop)).toBeNull();
  });

  test('each step knows where the next one is', () => {
    expect(nextHref('owner', 'pair', phone)).toEqual({ pathname: '/welcome/privacy', params: { mode: 'owner-enroll' } });
    expect(nextHref('owner', 'privacy', phone)).toEqual({ pathname: '/welcome/face', params: { mode: 'owner-enroll' } });
    expect(nextHref('owner', 'face', phone)).toEqual({ pathname: '/welcome/modules', params: { flow: 'owner' } });
    expect(nextHref('owner', 'modules', phone)).toEqual({
      pathname: '/welcome/module-privacy',
      params: { flow: 'owner' },
    });
    expect(nextHref('owner', 'meet', phone)).toBeNull();
    expect(nextHref('invited', 'invitation', phone)).toEqual({
      pathname: '/welcome/privacy',
      params: { mode: 'invite-enroll' },
    });
    expect(nextHref('invited', 'face', phone)).toEqual({ pathname: '/welcome/voice', params: { flow: 'invited' } });
  });

  test('the flow is read from either route parameter', () => {
    expect(flowOf({ mode: 'invite-enroll' })).toBe('invited');
    expect(flowOf({ mode: 'owner-enroll' })).toBe('owner');
    expect(flowOf({ flow: 'invited' })).toBe('invited');
    expect(flowOf({})).toBe('owner');
    expect(enrollModeOf('invited')).toBe('invite-enroll');
    expect(hrefOf('owner', ONBOARDING_FLOWS.owner[0]!)).toEqual({ pathname: '/welcome/pairing', params: { flow: 'owner' } });
  });

  test('only modules, their answers and meeting Argus can be skipped', () => {
    expect(isSkippable('owner', 'modules')).toBe(true);
    expect(isSkippable('owner', 'module-privacy')).toBe(true);
    expect(isSkippable('owner', 'meet')).toBe(true);
    expect(isSkippable('owner', 'privacy')).toBe(false);
    expect(isSkippable('invited', 'face')).toBe(false);
  });
});
