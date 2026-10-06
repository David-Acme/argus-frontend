import { describe, expect, test } from 'bun:test';
import { routeFallback, routeModuleEnabled } from '@/shared/libs/route-access';

describe('routeFallback', () => {
  test('owner reaches settings and users but not the guard directory', () => {
    expect(routeFallback('/settings', 'owner')).toBeNull();
    expect(routeFallback('/users', 'owner')).toBeNull();
    expect(routeFallback('/people', 'owner')).toBe('/profile');
    expect(routeFallback('/security', 'owner')).toBeNull();
  });

  test('guard reaches the directory and security only', () => {
    expect(routeFallback('/people', 'guard')).toBeNull();
    expect(routeFallback('/security', 'guard')).toBeNull();
    expect(routeFallback('/users', 'guard')).toBe('/profile');
    expect(routeFallback('/settings', 'guard')).toBe('/profile');
  });

  test('guest is sent home from security and to profile elsewhere', () => {
    expect(routeFallback('/security', 'guest')).toBe('/');
    expect(routeFallback('/people', 'guest')).toBe('/profile');
    expect(routeFallback('/agenda', 'guest')).toBeNull();
    expect(routeFallback('/security/3', 'guest')).toBe('/');
    expect(routeFallback('/security/3', 'guard')).toBeNull();
  });

  test('configuration is the owner\'s alone; sessions live in every profile', () => {
    expect(routeFallback('/settings', 'resident')).toBe('/profile');
    expect(routeFallback('/settings', 'guest')).toBe('/profile');
    expect(routeFallback('/profile', 'guest')).toBeNull();
  });
});

describe('routeFallback with modules', () => {
  const coreOnly = new Set(['core']);

  test('a disabled module sends its screens home', () => {
    expect(routeFallback('/cameras', 'owner', coreOnly)).toBe('/');
    expect(routeFallback('/cameras/4', 'owner', coreOnly)).toBe('/');
    expect(routeFallback('/security', 'owner', coreOnly)).toBe('/');
    expect(routeFallback('/users/visitors', 'owner', coreOnly)).toBe('/');
    expect(routeFallback('/agenda', 'resident', coreOnly)).toBe('/');
    expect(routeFallback('/projects', 'owner', new Set(['core', 'surveillance']))).toBe('/');
  });

  test('screens outside modules and enabled modules are untouched', () => {
    expect(routeFallback('/users', 'owner', coreOnly)).toBeNull();
    expect(routeFallback('/settings/modules', 'owner', coreOnly)).toBeNull();
    expect(routeFallback('/agenda', 'owner', new Set(['core', 'productivity']))).toBeNull();
  });

  test('an unknown enabled set hides nothing, and role rules still win', () => {
    expect(routeFallback('/cameras', 'owner', null)).toBeNull();
    expect(routeFallback('/settings/modules', 'guest', null)).toBe('/profile');
    expect(routeModuleEnabled('/agenda?new=event', coreOnly)).toBe(false);
    expect(routeModuleEnabled('/call', coreOnly)).toBe(true);
  });
});
