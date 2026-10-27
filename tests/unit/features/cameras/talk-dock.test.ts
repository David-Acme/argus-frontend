import { describe, expect, test } from 'bun:test';
import {
  callTroubleOf,
  dockPhase,
  holdReducer,
  holdTalking,
  litBars,
} from '@/features/cameras/model/talk-dock';
import type { HoldEvent, HoldPhase } from '@/features/cameras/model/talk-dock';

const steps = (events: readonly HoldEvent[]): HoldPhase => events.reduce(holdReducer, 'idle');

describe('hold to talk, with a tap alternative', () => {
  test('holding talks and letting go stops', () => {
    expect(holdTalking(steps(['hold']))).toBe(true);
    expect(holdTalking(steps(['hold', 'release']))).toBe(false);
  });

  test('a tap latches talking until the next tap', () => {
    expect(steps(['tap'])).toBe('latched');
    expect(holdTalking(steps(['tap']))).toBe(true);
    expect(steps(['tap', 'tap'])).toBe('idle');
  });

  test('a press a scroll took never talks, and a release alone changes nothing', () => {
    expect(steps(['release'])).toBe('idle');
    expect(steps(['tap', 'release'])).toBe('latched');
  });

  test('a hold over a latched talk ends it on release', () => {
    expect(steps(['tap', 'hold', 'release'])).toBe('idle');
  });

  test('leaving the screen always stops talking', () => {
    expect(steps(['tap', 'leave'])).toBe('idle');
    expect(steps(['hold', 'leave'])).toBe('idle');
  });
});

describe('the dock phase', () => {
  test('a call shows its own phase, push talking shows talking', () => {
    expect(dockPhase(null, false)).toBe('idle');
    expect(dockPhase(null, true)).toBe('talking');
    expect(dockPhase({ state: 'connecting', mode: 'call' }, false)).toBe('opening');
    expect(dockPhase({ state: 'live', mode: 'call' }, false)).toBe('call');
    expect(dockPhase({ state: 'ending', mode: 'call' }, false)).toBe('idle');
    expect(dockPhase({ state: 'live', mode: 'push' }, true)).toBe('talking');
  });

  test('the meter lights its bars from the level, clamped', () => {
    expect(litBars(0)).toBe(0);
    expect(litBars(0.5)).toBe(6);
    expect(litBars(2)).toBe(12);
    expect(litBars(-1)).toBe(0);
  });
});

describe('call trouble is words, never the server text', () => {
  test('known codes map to their message and a denied microphone asks again', () => {
    expect(callTroubleOf(null)).toBeNull();
    expect(callTroubleOf({ error: 'mic-denied', closedReason: null })).toEqual({
      message: 'screens.cameras.call.error-mic-denied',
      askMic: true,
    });
    expect(callTroubleOf({ error: 'busy', closedReason: 'raw text' })?.message).toBe(
      'screens.cameras.call.error-busy'
    );
  });

  test('an unknown code is the generic message and an unknown close says nothing', () => {
    expect(callTroubleOf({ error: 'weird', closedReason: null })?.message).toBe(
      'common.errors.unknown'
    );
    expect(callTroubleOf({ error: null, closedReason: '1000' })).toBeNull();
    expect(callTroubleOf({ error: null, closedReason: 'limit' })?.message).toBe(
      'screens.cameras.call.closed-limit'
    );
  });
});
