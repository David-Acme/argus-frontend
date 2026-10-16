import { describe, expect, test } from 'bun:test';
import { leaveAction, leaveCall } from '@/features/voice/model/leave-call';

const effectsFor = (canGoBack: boolean, enteredFromOutside: boolean, order: string[]) => ({
  stopVoice: () => order.push('stop'),
  canGoBack: () => canGoBack,
  goBack: () => order.push('back'),
  sendToBackground: () => order.push('background'),
  enteredFromOutside,
});

describe('leaving the call screen', () => {
  test('an in-app ring declined goes back to the route he was on and stays in the app', () => {
    const order: string[] = [];
    leaveCall(effectsFor(true, false, order));
    expect(order).toEqual(['stop', 'back']);
  });

  test('an in-app call with no history stays on its route and never backgrounds the app', () => {
    const order: string[] = [];
    leaveCall(effectsFor(false, false, order));
    expect(order).toEqual(['stop']);
  });

  test('a call entered from outside with history pops /call first, then goes to the background and keeps the call running', () => {
    const order: string[] = [];
    leaveCall(effectsFor(true, true, order));
    expect(order).toEqual(['back', 'background']);
  });

  test('a call entered from outside with nothing to return to goes straight to the background and keeps the call running', () => {
    const order: string[] = [];
    leaveCall(effectsFor(false, true, order));
    expect(order).toEqual(['background']);
  });

  test('an outside call backgrounds even when the app has history under it', () => {
    expect(leaveAction({ canGoBack: true, enteredFromOutside: true })).toBe('background');
    expect(leaveAction({ canGoBack: true, enteredFromOutside: false })).toBe('back');
  });
});
