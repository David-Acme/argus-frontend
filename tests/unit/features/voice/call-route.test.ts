import { beforeEach, describe, expect, test } from 'bun:test';
import { afterSignInHref, usePendingCallStore } from '@/core/stores/pending-call.store';
import { callRouteDecision, callRouteHref } from '@/features/voice/model/call-route';

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

describe('a call answered while signed out', () => {
  beforeEach(() => {
    usePendingCallStore.setState({ pending: null });
  });

  test('the call link is built with its id and the outside flag', () => {
    expect(callRouteHref({ callId: 'call-114', outside: true })).toBe('/call?callId=call-114&outside=1');
    expect(callRouteHref({ callId: 'rtc-0123', outside: false })).toBe('/call?callId=rtc-0123');
  });

  test('login resumes the same call, which then renders and claims once the access view is ready', () => {
    usePendingCallStore.getState().hold(callRouteHref({ callId: 'call-114', outside: true }), 1_000);
    expect(afterSignInHref(2_000)).toBe('/call?callId=call-114&outside=1');
    expect(callRouteDecision({ signedIn: true, ready: true, waitedOut: false, allowed: true })).toBe('render');
  });
});
