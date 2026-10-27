import { describe, expect, mock, test } from 'bun:test';
import { act, renderHook } from '@testing-library/react';

const asked: string[] = [];

mock.module('@/features/cameras/services/camera-control.service', () => ({
  cameraControlService: {
    snapshot: async (id: string) => {
      asked.push(id);
      return { ok: true, info: { image: `data:image/jpeg;base64,${id}` } };
    },
  },
}));

const { useAuthStore } = await import('@/core/stores/auth.store');
const { rememberCameraFrame } = await import('@/features/cameras/services/camera-frame-cache');
const { useCameraStill } = await import('@/features/cameras/hooks/use-camera-still');

describe('a camera still', () => {
  test('a known frame paints at once with no request', () => {
    useAuthStore.setState({ status: 'signed-in' });
    rememberCameraFrame('c1', 'data:image/jpeg;base64,known');
    const { result } = renderHook(() => useCameraStill('c1'));
    expect(result.current).toBe('data:image/jpeg;base64,known');
    expect(asked).toEqual([]);
  });

  test('an unknown frame is asked for once and kept for the next card', async () => {
    useAuthStore.setState({ status: 'signed-in' });
    const first = renderHook(() => useCameraStill('c2'));
    await act(async () => undefined);
    expect(first.result.current).toBe('data:image/jpeg;base64,c2');
    const second = renderHook(() => useCameraStill('c2'));
    expect(second.result.current).toBe('data:image/jpeg;base64,c2');
    expect(asked).toEqual(['c2']);
  });

  test('a private camera asks for nothing', () => {
    const { result } = renderHook(() => useCameraStill(null));
    expect(result.current).toBeNull();
    expect(asked).toEqual(['c2']);
  });
});
