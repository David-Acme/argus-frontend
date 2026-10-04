import { describe, expect, test } from 'bun:test';
import { routeFallback } from '@/shared/libs/route-access';

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
  });

  test('configuration is the owner\'s alone; sessions live in every profile', () => {
    expect(routeFallback('/settings', 'resident')).toBe('/profile');
    expect(routeFallback('/settings', 'guest')).toBe('/profile');
    expect(routeFallback('/profile', 'guest')).toBeNull();
  });
});
