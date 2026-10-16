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

  test('a ring answered from the lock screen with nothing to return to goes to the background', () => {
    const order: string[] = [];
    leaveCall(effectsFor(false, true, order));
    expect(order).toEqual(['stop', 'background']);
  });

  test('an in-app call with no history stays on its route and never backgrounds the app', () => {
    const order: string[] = [];
    leaveCall(effectsFor(false, false, order));
    expect(order).toEqual(['stop']);
  });

  test('leaving prefers going back over backgrounding, even when entered from outside', () => {
    expect(leaveAction({ canGoBack: true, enteredFromOutside: true })).toBe('back');
  });
});
