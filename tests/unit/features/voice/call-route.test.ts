import { describe, expect, test } from 'bun:test';
import { callRouteDecision } from '@/features/voice/model/call-route';

describe('the call route', () => {
  test('a signed-out device is sent home whatever else it knows', () => {
    expect(callRouteDecision({ signedIn: false, ready: true, waitedOut: false, allowed: true })).toBe('redirect');
  });

  test('while the access view is still loading the route shows the loading state, not home', () => {
    expect(callRouteDecision({ signedIn: true, ready: false, waitedOut: false, allowed: false })).toBe('wait');
  });

  test('a loaded view that allows calls renders the call', () => {
    expect(callRouteDecision({ signedIn: true, ready: true, waitedOut: false, allowed: true })).toBe('render');
  });

  test('a loaded view that refuses calls is sent home', () => {
    expect(callRouteDecision({ signedIn: true, ready: true, waitedOut: false, allowed: false })).toBe('redirect');
  });

  test('when the view never becomes ready, the persisted capabilities decide after the wait', () => {
    expect(callRouteDecision({ signedIn: true, ready: false, waitedOut: true, allowed: true })).toBe('render');
    expect(callRouteDecision({ signedIn: true, ready: false, waitedOut: true, allowed: false })).toBe('redirect');
  });
});
