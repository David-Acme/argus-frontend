import { describe, expect, test } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import type { LayoutChangeEvent } from 'react-native';
import { useFit } from '@/shared/ui/choice/use-fit';

const layout = (width: number) => ({ nativeEvent: { layout: { width } } }) as LayoutChangeEvent;

describe('useFit', () => {
  test('an option that arrives after the first layout is measured too', () => {
    const { result, rerender } = renderHook(({ count }) => useFit(count), {
      initialProps: { count: 2 },
    });
    act(() => {
      result.current.onLayout(layout(300));
      result.current.measure(0, 40);
      result.current.measure(1, 40);
    });
    expect(result.current.fits).toBe(true);
    rerender({ count: 3 });
    act(() => result.current.measure(2, 200));
    expect(result.current.fits).toBe(false);
  });
});
