import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import { useScrollActivity } from '@/features/conversations/hooks/use-scroll-activity';

const clock = { now: 0 };

const now = spyOn(performance, 'now').mockImplementation(() => clock.now);

afterEach(() => {
  clock.now = 0;
});

describe('the scroll activity', () => {
  test('a burst of scroll events arms the fade once, and a later scroll arms it again', () => {
    const { result } = renderHook(() => useScrollActivity({ holdMs: 1000, reduceMotion: false }));
    const armed: unknown[] = [];
    const { shown } = result.current;
    const set = shown.set.bind(shown);
    shown.set = (next) => {
      armed.push(next);
      set(next);
    };
    clock.now = 5000;
    act(() => result.current.touch());
    clock.now = 5016;
    act(() => result.current.touch());
    clock.now = 5100;
    act(() => result.current.touch());
    expect(armed).toHaveLength(1);
    clock.now = 5400;
    act(() => result.current.touch());
    expect(armed).toHaveLength(2);
    expect(shown.get()).toBe(0);
    expect(now).toHaveBeenCalled();
  });
});
