import { afterEach, describe, expect, jest, test } from 'bun:test';
import { useToastStore } from '@/core/stores/toast.store';
import { TOAST_ACTION_MS, TOAST_DEFAULT_MS, TOAST_MAX_VISIBLE } from '@/shared/constants';

afterEach(() => {
  jest.useRealTimers();
  useToastStore.getState().clear();
});

describe('toast store', () => {
  test('a plain toast carries no action and leaves after the default time', () => {
    jest.useFakeTimers();
    const id = useToastStore.getState().show('success', 'Saved');
    const [item] = useToastStore.getState().items;
    expect(item).toEqual({ id, intent: 'success', title: 'Saved', description: undefined });
    expect(item && 'action' in item).toBe(false);
    jest.advanceTimersByTime(TOAST_DEFAULT_MS);
    expect(useToastStore.getState().items).toHaveLength(0);
  });

  test('an action toast keeps its action and stays for the longer action time', () => {
    jest.useFakeTimers();
    let pressed = 0;
    const action = { label: 'Undo', onPress: () => (pressed += 1) };
    useToastStore.getState().show('info', 'Task deleted', undefined, action);
    jest.advanceTimersByTime(TOAST_DEFAULT_MS);
    const [item] = useToastStore.getState().items;
    expect(item?.action?.label).toBe('Undo');
    item?.action?.onPress();
    expect(pressed).toBe(1);
    jest.advanceTimersByTime(TOAST_ACTION_MS - TOAST_DEFAULT_MS);
    expect(useToastStore.getState().items).toHaveLength(0);
  });

  test('only the newest toasts stay visible', () => {
    for (let index = 0; index < TOAST_MAX_VISIBLE + 2; index += 1) {
      useToastStore.getState().show('info', `Toast ${index}`);
    }
    const titles = useToastStore.getState().items.map((item) => item.title);
    expect(titles).toHaveLength(TOAST_MAX_VISIBLE);
    expect(titles.at(-1)).toBe(`Toast ${TOAST_MAX_VISIBLE + 1}`);
  });
});
