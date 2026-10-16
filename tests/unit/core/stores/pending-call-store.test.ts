import { beforeEach, describe, expect, test } from 'bun:test';
import { PENDING_CALL_TTL_MS, afterSignInHref, usePendingCallStore } from '@/core/stores/pending-call.store';

describe('the pending call across sign-in', () => {
  beforeEach(() => {
    usePendingCallStore.setState({ pending: null });
  });

  test('a held call is taken once, and the next sign-in goes home', () => {
    usePendingCallStore.getState().hold('/call?callId=call-114&outside=1', 1_000);
    expect(usePendingCallStore.getState().take(2_000)).toBe('/call?callId=call-114&outside=1');
    expect(usePendingCallStore.getState().take(2_000)).toBeNull();
  });

  test('a call held longer than the TTL is dropped, not resumed', () => {
    usePendingCallStore.getState().hold('/call?callId=call-114', 1_000);
    expect(usePendingCallStore.getState().take(1_000 + PENDING_CALL_TTL_MS + 1)).toBeNull();
  });

  test('a sign-in with nothing held goes to the home screen', () => {
    expect(afterSignInHref(5_000)).toBe('/');
  });

  test('a sign-in with a call held goes to that call, once', () => {
    usePendingCallStore.getState().hold('/call?callId=call-114&outside=1', 5_000);
    expect(afterSignInHref(6_000)).toBe('/call?callId=call-114&outside=1');
    expect(afterSignInHref(6_000)).toBe('/');
  });
});
