import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import '../ui/translation-stub';

const stored = new Map<string, unknown>();
const toasts: string[] = [];
const devices: { kind: string; deviceId: string; label: string }[] = [];
const listeners: (() => void)[] = [];

Object.defineProperty(globalThis.navigator, 'mediaDevices', {
  configurable: true,
  value: {
    enumerateDevices: async () => devices.map((device) => ({ ...device })),
    addEventListener: (_name: string, listener: () => void) => listeners.push(listener),
    removeEventListener: (_name: string, listener: () => void) =>
      listeners.splice(listeners.indexOf(listener), 1),
  },
});

mock.module('@/core/services/storage', () => ({
  storageService: {
    getObject: (key: string) => stored.get(key) ?? null,
    setObject: (key: string, value: unknown) => stored.set(key, value),
    remove: (key: string) => stored.delete(key),
  },
}));
mock.module('@/shared/libs/toast', () => ({
  toast: { info: (title: string) => toasts.push(title) },
}));

const {
  audioConstraintsOf,
  chooseMicrophone,
  chosenMicrophone,
  lostChoiceOf,
  microphonesOf,
  refreshMicrophones,
  useMicrophoneStore,
} = await import('@/shared/libs/microphone');
const { useMicrophones } = await import('@/shared/hooks/use-microphones');
const { useMicrophoneNotice } = await import('@/shared/hooks/use-microphone-notice');

const USB = { deviceId: 'usb-1', label: 'Micrófono USB' };

const plugIn = (...entries: { deviceId: string; label: string }[]) => {
  devices.length = 0;
  devices.push(
    { kind: 'audioinput', deviceId: 'default', label: 'Predeterminado' },
    { kind: 'audiooutput', deviceId: 'speakers', label: 'Altavoces' },
    ...entries.map((entry) => ({ kind: 'audioinput', ...entry }))
  );
};

afterEach(() => {
  stored.clear();
  toasts.length = 0;
  listeners.length = 0;
  useMicrophoneStore.setState({ devices: [], choice: null, lost: null });
});

describe('the microphone choice', () => {
  test('lists the real inputs only, without the system aliases or the speakers', () => {
    plugIn(USB, { deviceId: 'built-in', label: '' });
    expect(microphonesOf(devices)).toEqual([USB, { deviceId: 'built-in', label: '' }]);
  });

  test('persists on this device and asks every capture for that input, never forcing it', () => {
    chooseMicrophone(USB);
    expect(stored.get('app.microphone')).toEqual(USB);
    expect(chosenMicrophone()).toEqual(USB);
    expect(audioConstraintsOf({ channelCount: 1 }, USB)).toEqual({
      channelCount: 1,
      deviceId: { ideal: 'usb-1' },
    });
    chooseMicrophone(null);
    expect(stored.has('app.microphone')).toBe(false);
    expect(audioConstraintsOf({ channelCount: 1 }, null)).toEqual({ channelCount: 1 });
  });

  test('a chosen input that disappears falls back to the system one, and says so quietly', async () => {
    plugIn(USB);
    chooseMicrophone(USB);
    await act(async () => {
      renderHook(() => {
        useMicrophones();
        useMicrophoneNotice();
      });
    });
    expect(toasts).toEqual([]);
    plugIn({ deviceId: 'built-in', label: 'Micrófono interno' });
    await act(async () => {
      listeners.forEach((listener) => listener());
      await Promise.resolve();
    });
    expect(chosenMicrophone()).toBeNull();
    expect(stored.has('app.microphone')).toBe(false);
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toContain('Micrófono USB');
  });

  test('an unknown device list keeps the choice: nothing is lost before the browser answers', async () => {
    expect(lostChoiceOf(USB, [])).toBeNull();
    devices.length = 0;
    chooseMicrophone(USB);
    expect((await refreshMicrophones()).lost).toBeNull();
    expect(chosenMicrophone()).toEqual(USB);
  });

  test('the options start with the system default and mark the chosen one', async () => {
    plugIn(USB);
    chooseMicrophone(USB);
    const { result } = renderHook(() => useMicrophones());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.options.map((option) => option.id)).toEqual(['system', 'usb-1']);
    expect(result.current.selected).toBe('usb-1');
    expect(result.current.menu.map((item) => item.icon)).toEqual(['mic', 'check']);
    act(() => result.current.choose('system'));
    expect(chosenMicrophone()).toBeNull();
  });
});
