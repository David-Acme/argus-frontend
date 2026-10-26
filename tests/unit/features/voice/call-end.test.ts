import { describe, expect, test } from 'bun:test';
import {
  cancelOutcomeOf,
  callEndAction,
  dispatchCallEnd,
  ENDED_HOLD_MS,
  endReasonOfCancel,
  showsMicConsent,
} from '@/features/voice/model/call-end';

describe('how a call ends on the screen', () => {
  test('an answered call that ends, on either side, shows the ended state first', () => {
    expect(callEndAction('answered-ended')).toBe('show-ended');
  });

  test('a missed, declined or claimed-elsewhere ring closes at once', () => {
    expect(callEndAction('missed')).toBe('close-now');
    expect(callEndAction('declined')).toBe('close-now');
    expect(callEndAction('claimed-elsewhere')).toBe('close-now');
  });

  test('the ended state holds for two seconds', () => {
    expect(ENDED_HOLD_MS).toBe(2000);
  });

  test('the server cancel reasons map to the same end reasons the screen uses', () => {
    expect(endReasonOfCancel('answered_elsewhere')).toBe('claimed-elsewhere');
    expect(endReasonOfCancel('declined')).toBe('declined');
    expect(endReasonOfCancel('expired')).toBe('missed');
    expect(endReasonOfCancel('resolved')).toBe('missed');
    expect(endReasonOfCancel('attended')).toBe('missed');
  });

  test('the dispatcher runs the ended state only for an answered call', () => {
    const order: string[] = [];
    const handlers = { showEnded: () => order.push('ended'), closeNow: () => order.push('close') };
    dispatchCallEnd('answered-ended', handlers);
    dispatchCallEnd('claimed-elsewhere', handlers);
    dispatchCallEnd('missed', handlers);
    expect(order).toEqual(['ended', 'close', 'close']);
  });
});

describe('a cancel arriving while the call is open on this device', () => {
  test('the answer this device made is not reported as taken by another device', () => {
    expect(
      cancelOutcomeOf({ reason: 'answered_elsewhere', callId: 'call-7', claimedCallId: 'call-7' })
    ).toBe('ignore');
  });

  test('an answer by another device is reported as taken', () => {
    expect(
      cancelOutcomeOf({ reason: 'answered_elsewhere', callId: 'call-7', claimedCallId: null })
    ).toBe('taken');
    expect(
      cancelOutcomeOf({ reason: 'answered_elsewhere', callId: 'call-7', claimedCallId: 'call-8' })
    ).toBe('taken');
  });

  test('a call the server already settled closes without an error', () => {
    for (const reason of ['expired', 'declined', 'resolved', 'attended'] as const) {
      expect(cancelOutcomeOf({ reason, callId: 'call-7', claimedCallId: null })).toBe('close');
    }
  });
});

describe('the first-call microphone note', () => {
  test('it shows while the first call runs and leaves once the call ended', () => {
    expect(showsMicConsent({ firstCall: true, phase: 'listening', endedDurationMs: null })).toBe(
      true
    );
    expect(showsMicConsent({ firstCall: true, phase: 'done', endedDurationMs: null })).toBe(false);
    expect(showsMicConsent({ firstCall: true, phase: 'listening', endedDurationMs: 4000 })).toBe(
      false
    );
    expect(showsMicConsent({ firstCall: false, phase: 'listening', endedDurationMs: null })).toBe(
      false
    );
  });
});
