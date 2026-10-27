import { describe, expect, test } from 'bun:test';
import { callBackHref, callBackHrefOf } from '@/shared/libs/call-back';
import { callStartOf } from '@/features/voice/model/call-back';

describe('calling Argus back from a missed call', () => {
  test('a missed reminder call calls back with its reminder, any other missed call is a plain call', () => {
    expect(callBackHref(12)).toBe('/call?purpose=call_back&reminderId=12');
    expect(callBackHref(null)).toBe('/call');
    expect(callBackHrefOf({ category: 'reminder', urgency: 'normal', reminderId: 7 })).toBe(
      '/call?purpose=call_back&reminderId=7'
    );
    expect(callBackHrefOf({ category: 'reminder', urgency: 'critical', reminderId: 7 })).toBe(
      '/call'
    );
    expect(callBackHrefOf({})).toBe('/call');
  });

  test('the call screen starts with the purpose and the reminder only when both are valid', () => {
    expect(callStartOf({ purpose: 'call_back', reminderId: '12' })).toEqual({
      purpose: 'call_back',
      reminderId: 12,
    });
    expect(callStartOf({ purpose: 'call_back', reminderId: 'x' })).toEqual({});
    expect(callStartOf({ purpose: 'onboarding', reminderId: '12' })).toEqual({});
    expect(callStartOf({ callId: 'abc', purpose: 'call_back', reminderId: '12' })).toEqual({
      callId: 'abc',
    });
    expect(callStartOf({})).toEqual({});
  });
});
