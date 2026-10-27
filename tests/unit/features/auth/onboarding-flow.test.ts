import { describe, expect, test } from 'bun:test';
import {
  enrollModeOf,
  flowOf,
  hrefOf,
  nextHref,
  ONBOARDING_FLOWS,
  progressOf,
  signalsKnownAt,
  stepsOf,
} from '@/features/auth/model/onboarding-flow';

const phone = { native: true };
const desktop = { native: false };

const ids = (flow: 'owner' | 'invited') => ONBOARDING_FLOWS[flow].map((step) => step.id);

describe('onboarding flows are data', () => {
  test('a new owner pairs, consents, enrols, says their name, chooses modules and meets Argus', () => {
    expect(ids('owner')).toEqual([
      'pair',
      'privacy',
      'face',
      'name',
      'modules',
      'module-privacy',
      'permissions',
      'meet',
      'ready',
    ]);
  });

  test('an invited person never chooses modules', () => {
    expect(ids('invited')).toEqual([
      'invitation',
      'privacy',
      'face',
      'name',
      'permissions',
      'meet',
      'ready',
    ]);
  });

  test('consent comes before the face, and the name after it, when a session exists', () => {
    const owner = ids('owner');
    expect(owner.indexOf('privacy')).toBeLessThan(owner.indexOf('face'));
    expect(owner.indexOf('face')).toBeLessThan(owner.indexOf('name'));
    expect(owner.indexOf('modules')).toBeLessThan(owner.indexOf('module-privacy'));
  });

  test('the dots count only the setup steps', () => {
    expect(progressOf('owner', 'pair', phone)).toEqual({
      current: 1,
      total: 6,
      label: 'screens.welcome.steps.pair',
    });
    expect(progressOf('owner', 'name', phone)).toMatchObject({ current: 4, total: 6 });
    expect(progressOf('owner', 'permissions', phone)).toBeNull();
    expect(progressOf('owner', 'meet', phone)).toBeNull();
    expect(progressOf('invited', 'invitation', phone)).toBeNull();
    expect(progressOf('invited', 'face', phone)).toMatchObject({ current: 2, total: 3 });
  });

  test('the module answers drop out, and the count with them, when no chosen module has signals', () => {
    const none = { native: true, moduleSignals: false };
    expect(stepsOf('owner', none).map((step) => step.id)).not.toContain('module-privacy');
    expect(progressOf('owner', 'modules', none)).toMatchObject({ current: 5, total: 5 });
    expect(nextHref('owner', 'modules', none)).toEqual({
      pathname: '/welcome/permissions',
      params: { flow: 'owner' },
    });
    expect(nextHref('owner', 'modules', { native: true, moduleSignals: true })).toEqual({
      pathname: '/welcome/module-privacy',
      params: { flow: 'owner' },
    });
  });

  test('the module answers are known only from their own step', () => {
    expect(signalsKnownAt('owner', 'modules')).toBe(false);
    expect(signalsKnownAt('owner', 'module-privacy')).toBe(true);
    expect(signalsKnownAt('owner', 'ready')).toBe(true);
    expect(signalsKnownAt('invited', 'meet')).toBe(false);
  });

  test('the desktop only pairs, so it shows no dots and has no next step', () => {
    expect(stepsOf('owner', desktop).map((step) => step.id)).toEqual(['pair']);
    expect(progressOf('owner', 'pair', desktop)).toBeNull();
    expect(nextHref('owner', 'pair', desktop)).toBeNull();
  });

  test('each step knows where the next one is', () => {
    expect(nextHref('owner', 'pair', phone)).toEqual({
      pathname: '/welcome/privacy',
      params: { mode: 'owner-enroll' },
    });
    expect(nextHref('owner', 'face', phone)).toEqual({
      pathname: '/welcome/name',
      params: { flow: 'owner' },
    });
    expect(nextHref('owner', 'name', phone)).toEqual({
      pathname: '/welcome/modules',
      params: { flow: 'owner' },
    });
    expect(nextHref('owner', 'meet', phone)).toEqual({
      pathname: '/welcome/ready',
      params: { flow: 'owner' },
    });
    expect(nextHref('owner', 'ready', phone)).toBeNull();
    expect(nextHref('invited', 'invitation', phone)).toEqual({
      pathname: '/welcome/privacy',
      params: { mode: 'invite-enroll' },
    });
    expect(nextHref('invited', 'name', phone)).toEqual({
      pathname: '/welcome/permissions',
      params: { flow: 'invited' },
    });
  });

  test('the flow is read from either route parameter', () => {
    expect(flowOf({ mode: 'invite-enroll' })).toBe('invited');
    expect(flowOf({ mode: 'owner-enroll' })).toBe('owner');
    expect(flowOf({ flow: 'invited' })).toBe('invited');
    expect(flowOf({})).toBe('owner');
    expect(enrollModeOf('invited')).toBe('invite-enroll');
    expect(hrefOf('owner', ONBOARDING_FLOWS.owner[0]!)).toEqual({
      pathname: '/welcome/pairing',
      params: { flow: 'owner' },
    });
  });
});
