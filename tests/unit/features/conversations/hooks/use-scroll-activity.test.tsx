import { afterEach, describe, expect, jest, test } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import { useScrollActivity } from '@/features/conversations/hooks/use-scroll-activity';

afterEach(() => {
  jest.useRealTimers();
});

describe('the scroll activity', () => {
  test('a scroll marks the list as scrolling until the hold passes without another one', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useScrollActivity(1000));
    expect(result.current.scrolling).toBe(false);
    act(() => result.current.touch());
    expect(result.current.scrolling).toBe(true);
    act(() => jest.advanceTimersByTime(600));
    act(() => result.current.touch());
    act(() => jest.advanceTimersByTime(600));
    expect(result.current.scrolling).toBe(true);
    act(() => jest.advanceTimersByTime(500));
    expect(result.current.scrolling).toBe(false);
  });
});
