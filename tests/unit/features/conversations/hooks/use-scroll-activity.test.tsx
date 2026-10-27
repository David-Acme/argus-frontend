import { describe, expect, test } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import { useScrollActivity } from '@/features/conversations/hooks/use-scroll-activity';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('the scroll activity', () => {
  test('a scroll marks the list as scrolling until the hold passes without another one', async () => {
    const { result } = renderHook(() => useScrollActivity(40));
    expect(result.current.scrolling).toBe(false);
    act(() => result.current.touch());
    expect(result.current.scrolling).toBe(true);
    await act(() => wait(25));
    act(() => result.current.touch());
    await act(() => wait(25));
    expect(result.current.scrolling).toBe(true);
    await act(() => wait(30));
    expect(result.current.scrolling).toBe(false);
  });
});
