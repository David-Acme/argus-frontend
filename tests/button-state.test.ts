import { describe, expect, test } from 'bun:test';
import { getButtonState } from '../src/shared/libs/button-state';

describe('getButtonState', () => {
  test('blocks a press and exposes busy state while a server action is loading', () => {
    expect(getButtonState({ disabled: false, loading: true })).toEqual({
      accessibility: { busy: true, disabled: true },
      disabled: true,
    });
  });

  test('preserves a disabled button without presenting it as busy', () => {
    expect(getButtonState({ disabled: true, loading: false })).toEqual({
      accessibility: { disabled: true },
      disabled: true,
    });
  });

  test('leaves an idle action available', () => {
    expect(getButtonState({ disabled: false, loading: false })).toEqual({
      accessibility: { disabled: false },
      disabled: false,
    });
  });
});
