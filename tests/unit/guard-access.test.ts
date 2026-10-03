import { describe, expect, test } from 'bun:test';
import { guardAccessForRole } from '@/shared/libs/role-access';

describe('guardAccessForRole', () => {
  test('the owner sees, changes, manages visits and reviews decisions', () => {
    expect(guardAccessForRole('owner')).toEqual({ view: true, setMode: true, manageGuests: true, review: true });
  });

  test('a resident runs the house guard but does not calibrate it', () => {
    expect(guardAccessForRole('resident')).toEqual({ view: true, setMode: true, manageGuests: true, review: false });
  });

  test('a guard watches mode, incidents and visits without changing them', () => {
    expect(guardAccessForRole('guard')).toEqual({ view: true, setMode: false, manageGuests: false, review: false });
  });

  test('a guest has no guard surface', () => {
    expect(guardAccessForRole('guest')).toEqual({ view: false, setMode: false, manageGuests: false, review: false });
  });
});
