import { describe, expect, test } from 'bun:test';
import { callRouteDecision } from '@/features/voice/model/call-route';

describe('the call route', () => {
  test('a signed-out device is sent home whatever else it knows', () => {
    expect(callRouteDecision({ signedIn: false, ready: true, allowed: true })).toBe('redirect');
  });

  test('while the access view is still loading the route waits instead of bouncing home', () => {
    expect(callRouteDecision({ signedIn: true, ready: false, allowed: false })).toBe('wait');
  });

  test('a loaded view that allows calls renders the call', () => {
    expect(callRouteDecision({ signedIn: true, ready: true, allowed: true })).toBe('render');
  });

  test('a loaded view that refuses calls is sent home', () => {
    expect(callRouteDecision({ signedIn: true, ready: true, allowed: false })).toBe('redirect');
  });
});
