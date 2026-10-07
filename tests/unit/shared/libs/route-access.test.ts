import { describe, expect, test } from 'bun:test';
import { CAPABILITY } from '@/shared/constants';
import { routeFallback, routeModuleEnabled } from '@/shared/libs/route-access';
import { noContextView, viewFor } from '@tests/support/access-fixtures';

const everything = { modules: ['surveillance', 'productivity'] };
const coreOnly = { modules: [] };

describe('routeFallback by role', () => {
  test('owner reaches settings and users but not the guard directory', () => {
    const owner = viewFor('owner', everything);
    expect(routeFallback('/settings', owner)).toBeNull();
    expect(routeFallback('/users', owner)).toBeNull();
    expect(routeFallback('/people', owner)).toBe('/profile');
    expect(routeFallback('/security', owner)).toBeNull();
  });

  test('guard reaches the directory and security only', () => {
    const guard = viewFor('guard', everything);
    expect(routeFallback('/people', guard)).toBeNull();
    expect(routeFallback('/security', guard)).toBeNull();
    expect(routeFallback('/users', guard)).toBe('/profile');
    expect(routeFallback('/settings', guard)).toBe('/profile');
  });

  test('guest is sent home from security, agenda and projects and to profile elsewhere', () => {
    const guest = viewFor('guest', everything);
    expect(routeFallback('/security', guest)).toBe('/');
    expect(routeFallback('/security/3', guest)).toBe('/');
    expect(routeFallback('/people', guest)).toBe('/profile');
    expect(routeFallback('/agenda', guest)).toBe('/');
    expect(routeFallback('/projects', guest)).toBe('/');
    expect(routeFallback('/cameras', guest)).toBeNull();
    expect(routeFallback('/security/3', viewFor('guard', everything))).toBeNull();
  });

  test('configuration is the owner\'s alone; sessions live in every profile', () => {
    expect(routeFallback('/settings', viewFor('resident', everything))).toBe('/profile');
    expect(routeFallback('/settings/modules', viewFor('guest', everything))).toBe('/profile');
    expect(routeFallback('/profile', viewFor('guest', everything))).toBeNull();
  });

  test('the visitors screen follows the visitors capability, not the role', () => {
    expect(routeFallback('/users/visitors', viewFor('owner', everything))).toBeNull();
    expect(routeFallback('/users/visitors', viewFor('resident', everything))).toBe('/profile');
  });
});

describe('routeFallback with modules', () => {
  test('a disabled module sends its screens home', () => {
    const owner = viewFor('owner', coreOnly);
    expect(routeFallback('/cameras', owner)).toBe('/');
    expect(routeFallback('/cameras/4', owner)).toBe('/');
    expect(routeFallback('/security', owner)).toBe('/');
    expect(routeFallback('/users/visitors', owner)).toBe('/');
    expect(routeFallback('/agenda', viewFor('resident', coreOnly))).toBe('/');
    expect(routeFallback('/projects', viewFor('owner', { modules: ['surveillance'] }))).toBe('/');
  });

  test('screens outside modules and enabled modules are untouched', () => {
    const owner = viewFor('owner', coreOnly);
    expect(routeFallback('/users', owner)).toBeNull();
    expect(routeFallback('/settings/modules', owner)).toBeNull();
    expect(routeFallback('/agenda', viewFor('owner', { modules: ['productivity'] }))).toBeNull();
  });

  test('before any context only the core screens open and role rules still win', () => {
    const owner = noContextView('owner');
    expect(routeFallback('/cameras', owner)).toBe('/');
    expect(routeFallback('/agenda', owner)).toBe('/');
    expect(routeFallback('/settings', owner)).toBeNull();
    expect(routeFallback('/users', owner)).toBeNull();
    expect(routeFallback('/settings/modules', noContextView('guest'))).toBe('/profile');
  });

  test('a module route query does not hide the module from the check', () => {
    const view = viewFor('owner', coreOnly);
    expect(routeModuleEnabled('/agenda?edit=event-1', view)).toBe(false);
    expect(routeModuleEnabled('/call', view)).toBe(true);
  });
});

describe('routeFallback for a role whose module is off', () => {
  const guard = viewFor('guard', coreOnly);

  test('only home and the profile stay open', () => {
    expect(guard.roleActive).toBe(false);
    expect(routeFallback('/', guard)).toBeNull();
    expect(routeFallback('/profile', guard)).toBeNull();
    expect(routeFallback('/people', guard)).toBe('/');
    expect(routeFallback('/security', guard)).toBe('/');
    expect(routeFallback('/cameras', guard)).toBe('/');
    expect(routeFallback('/settings', guard)).toBe('/');
  });

  test('the call route follows calls.join, so the call an alert rings can be answered', () => {
    expect(guard.capabilities.has(CAPABILITY.callsJoin)).toBe(true);
    expect(routeFallback('/call', guard)).toBeNull();
    expect(routeFallback('/call?callId=12', guard)).toBeNull();
  });

  test('without calls.join the call route stays closed for a role whose module is off', () => {
    const without = { ...guard, capabilities: new Set([...guard.capabilities].filter((id) => id !== CAPABILITY.callsJoin)) };
    expect(routeFallback('/call', without)).toBe('/');
  });

  test('nothing else opens for it because of the call rule', () => {
    expect(routeFallback('/cameras', guard)).toBe('/');
    expect(routeFallback('/call/other', guard)).toBe('/');
  });
});
