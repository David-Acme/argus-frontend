import { describe, expect, test } from 'bun:test';
import { initialDashboardDestination } from '../src/shared/libs/dashboard-route-state';

describe('initialDashboardDestination', () => {
  test('mounts the dashboard immediately for an already authenticated session', () => {
    expect(initialDashboardDestination('signed-in')).toBe('home');
  });

  test('keeps unknown sessions behind the bootstrap gate until they resolve', () => {
    expect(initialDashboardDestination('loading')).toBe('loading');
    expect(initialDashboardDestination('signed-out')).toBe('loading');
  });
});
