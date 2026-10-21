import { describe, expect, test } from 'bun:test';
import { renderHook } from '@testing-library/react';
import { useOpenedOnce } from '@/shared/ui/sheet/use-opened-once';

describe('useOpenedOnce', () => {
  test('a sheet mounts on its first open and stays mounted after it closes', () => {
    const { result, rerender } = renderHook(({ open }) => useOpenedOnce(open), {
      initialProps: { open: false },
    });
    expect(result.current).toBe(false);
    rerender({ open: false });
    expect(result.current).toBe(false);
    rerender({ open: true });
    expect(result.current).toBe(true);
    rerender({ open: false });
    expect(result.current).toBe(true);
  });
});
