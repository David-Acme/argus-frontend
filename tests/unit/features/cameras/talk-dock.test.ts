import { describe, expect, test } from 'bun:test';
import {
  IDLE_HOLD,
  TAP_MS,
  callTroubleOf,
  dockPhase,
  holdReducer,
  holdTalking,
  litBars,
  type HoldState,
} from '@/features/cameras/model/talk-dock';

const steps = (events: readonly ['down' | 'up', number][]): HoldState =>
  events.reduce((state, [kind, at]) => holdReducer(state, { kind, at }), IDLE_HOLD);

describe('hold to talk, with a tap alternative', () => {
  test('holding talks and letting go stops', () => {
    const held = steps([['down', 0]]);
    expect(holdTalking(held)).toBe(true);
    expect(holdTalking(holdReducer(held, { kind: 'up', at: TAP_MS + 1 }))).toBe(false);
  });

  test('a tap latches talking until the next tap', () => {
    const latched = steps([
      ['down', 0],
      ['up', 120],
    ]);
    expect(latched.phase).toBe('latched');
    expect(holdTalking(latched)).toBe(true);
    const stopping = holdReducer(latched, { kind: 'down', at: 2000 });
    expect(holdTalking(stopping)).toBe(false);
    expect(holdReducer(stopping, { kind: 'up', at: 2100 })).toEqual(IDLE_HOLD);
  });

  test('a stray release changes nothing', () => {
    expect(holdReducer(IDLE_HOLD, { kind: 'up', at: 10 })).toBe(IDLE_HOLD);
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
