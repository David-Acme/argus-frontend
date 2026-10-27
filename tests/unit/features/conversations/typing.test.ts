import { describe, expect, test } from 'bun:test';
import { readTypingFrame } from '@/core/contracts/conversation.contract';
import { nextTypingSignal, TYPING_SIGNAL_IDLE } from '@/features/conversations/model/typing-signal';
import { TypingTracker } from '@/features/conversations/services/typing/typing-tracker';

function clock() {
  let now = 1_000;
  const timers: { at: number; run: () => void }[] = [];
  return {
    now: () => now,
    schedule: (run: () => void, ms: number) => {
      const timer = { at: now + ms, run };
      timers.push(timer);
      return () => timers.splice(timers.indexOf(timer), 1);
    },
    advance: (ms: number) => {
      now += ms;
      for (const timer of [...timers].filter((candidate) => candidate.at <= now)) {
        timers.splice(timers.indexOf(timer), 1);
        timer.run();
      }
    },
  };
}

describe('the typing frame', () => {
  test('reads the wire, caps the time to live and refuses a frame without a thread', () => {
    expect(
      readTypingFrame({ counterpartId: 0, active: true, ttlMs: 6000, clientId: 'c1' })
    ).toEqual({
      counterpartId: 0,
      active: true,
      ttlMs: 6000,
      clientId: 'c1',
    });
    expect(readTypingFrame({ counterpartId: 4, active: true, ttlMs: 90_000 })?.ttlMs).toBe(30_000);
    expect(readTypingFrame({ active: true })).toBeNull();
  });
});

describe('who is typing', () => {
  test('a frame shows the dots until its time to live passes without a refresh', () => {
    const time = clock();
    const tracker = new TypingTracker(time);
    tracker.apply({ counterpartId: 0, active: true, ttlMs: 6000, clientId: 'c1' });
    expect(tracker.snapshot.typing.has(0)).toBe(true);
    expect(tracker.snapshot.typed.has('c1')).toBe(true);
    time.advance(5000);
    tracker.apply({ counterpartId: 0, active: true, ttlMs: 6000, clientId: 'c1' });
    time.advance(5000);
    expect(tracker.snapshot.typing.has(0)).toBe(true);
    time.advance(1000);
    expect(tracker.snapshot.typing.has(0)).toBe(false);
    expect(tracker.snapshot.typed.has('c1')).toBe(true);
  });

  test('an end frame, the done frame or a lost socket hide it at once', () => {
    const tracker = new TypingTracker(clock());
    tracker.apply({ counterpartId: 3, active: true, ttlMs: 6000, clientId: null });
    tracker.apply({ counterpartId: 3, active: false, ttlMs: 0, clientId: null });
    expect(tracker.snapshot.typing.has(3)).toBe(false);
    tracker.apply({ counterpartId: 0, active: true, ttlMs: 6000, clientId: 'c2' });
    tracker.stop();
    expect(tracker.snapshot.typing.has(0)).toBe(false);
    tracker.clear();
    expect(tracker.snapshot.typed.size).toBe(0);
  });
});

describe('telling a member I am typing', () => {
  test('starts on the first key, refreshes at most every 2.5 s and stops once', () => {
    const typed = (state = TYPING_SIGNAL_IDLE, now = 0) =>
      nextTypingSignal({ state, event: 'typed', now, refreshMs: 2500 });
    const first = typed();
    expect(first.emit).toBe(true);
    expect(typed(first.state, 1000).emit).toBeNull();
    expect(typed(first.state, 2600).emit).toBe(true);
    const stop = nextTypingSignal({
      state: first.state,
      event: 'cleared',
      now: 3000,
      refreshMs: 2500,
    });
    expect(stop.emit).toBe(false);
    expect(
      nextTypingSignal({ state: stop.state, event: 'idle', now: 4000, refreshMs: 2500 }).emit
    ).toBeNull();
  });
});
