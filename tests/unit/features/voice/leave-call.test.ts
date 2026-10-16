import { describe, expect, test } from 'bun:test';
import { leaveCall } from '@/features/voice/model/leave-call';

describe('leaving the call screen', () => {
  test('leaving stops the voice session before the screen goes away', () => {
    const order: string[] = [];
    leaveCall({
      stopVoice: () => order.push('stop'),
      canGoBack: () => true,
      goBack: () => order.push('back'),
      sendToBackground: () => order.push('background'),
    });
    expect(order).toEqual(['stop', 'back']);
  });

  test('without a screen to return to, leaving sends the app to the background, never home', () => {
    const order: string[] = [];
    leaveCall({
      stopVoice: () => order.push('stop'),
      canGoBack: () => false,
      goBack: () => order.push('back'),
      sendToBackground: () => order.push('background'),
    });
    expect(order).toEqual(['stop', 'background']);
  });
});
