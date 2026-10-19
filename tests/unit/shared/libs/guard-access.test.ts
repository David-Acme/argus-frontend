import { describe, expect, test } from 'bun:test';
import { cameraActionsOf, guardAccessOf, peopleAccessOf } from '@/shared/libs/capabilities';
import { noContextView, viewFor } from '@tests/support/access-fixtures';

describe('guardAccessOf', () => {
  test('the owner sees, changes, manages visits and reviews decisions', () => {
    expect(guardAccessOf(viewFor('owner'))).toEqual({
      view: true,
      setMode: true,
      manageGuests: true,
      review: true,
      maintenance: true,
      answerTamper: true,
    });
  });

  test('a resident runs the house guard but does not calibrate it', () => {
    expect(guardAccessOf(viewFor('resident'))).toEqual({
      view: true,
      setMode: true,
      manageGuests: true,
      review: false,
      maintenance: true,
      answerTamper: true,
    });
  });

  test('a guard watches mode, incidents and visits without changing them', () => {
    expect(guardAccessOf(viewFor('guard'))).toEqual({
      view: true,
      setMode: false,
      manageGuests: false,
      review: false,
      maintenance: true,
      answerTamper: false,
    });
  });

  test('a guest has no guard surface', () => {
    expect(guardAccessOf(viewFor('guest'))).toEqual({
      view: false,
      setMode: false,
      manageGuests: false,
      review: false,
      maintenance: false,
      answerTamper: false,
    });
  });

  test('with surveillance off nobody has a guard surface, and before the context neither', () => {
    for (const role of ['owner', 'resident', 'guard', 'guest'] as const) {
      expect(guardAccessOf(viewFor(role, { modules: ['productivity'] })).view).toBe(false);
    }
    expect(guardAccessOf(noContextView('owner')).view).toBe(false);
  });
});

describe('cameraActionsOf', () => {
  test('guests watch without talking and guards talk and sound the siren', () => {
    expect(cameraActionsOf(viewFor('guest'))).toEqual({
      watch: true,
      talk: false,
      siren: false,
      aim: false,
      managePresets: false,
    });
    expect(cameraActionsOf(viewFor('guard'))).toEqual({
      watch: true,
      talk: true,
      siren: true,
      aim: true,
      managePresets: false,
    });
    expect(cameraActionsOf(viewFor('owner'))).toEqual({
      watch: true,
      talk: true,
      siren: true,
      aim: true,
      managePresets: true,
    });
  });

  test('no camera action without the module', () => {
    expect(cameraActionsOf(viewFor('owner', { modules: [] }))).toEqual({
      watch: false,
      talk: false,
      siren: false,
      aim: false,
      managePresets: false,
    });
  });
});

describe('peopleAccessOf', () => {
  test('the owner manages, the guard reads the directory and others only themselves', () => {
    expect(peopleAccessOf(viewFor('owner')).profileAction).toBe('manage');
    expect(peopleAccessOf(viewFor('guard')).profileAction).toBe('directory');
    expect(peopleAccessOf(viewFor('resident')).profileAction).toBeNull();
    expect(peopleAccessOf(viewFor('guest')).profileAction).toBeNull();
  });

  test('a guard whose module is off reads no directory', () => {
    expect(peopleAccessOf(viewFor('guard', { modules: [] }))).toEqual({
      profileAction: null,
      receivesDirectory: false,
      receivesInvitations: false,
    });
  });
});
