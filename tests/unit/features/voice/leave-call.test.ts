import { describe, expect, test } from 'bun:test';
import { leaveCall } from '@/features/voice/model/leave-call';

describe('leaving the call screen', () => {
  test('hanging up stops the voice session before the screen goes away', () => {
    const order: string[] = [];
    leaveCall({
      stopVoice: () => order.push('stop'),
      canGoBack: () => true,
      goBack: () => order.push('back'),
      goHome: () => order.push('home'),
    });
    expect(order).toEqual(['stop', 'back']);
  });

  test('without a screen to return to, hanging up goes home after stopping', () => {
    const order: string[] = [];
    leaveCall({
      stopVoice: () => order.push('stop'),
      canGoBack: () => false,
      goBack: () => order.push('back'),
      goHome: () => order.push('home'),
    });
    expect(order).toEqual(['stop', 'home']);
  });
});
