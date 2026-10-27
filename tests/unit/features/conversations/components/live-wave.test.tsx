import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import type { SharedValue } from 'react-native-reanimated';
import type { LiveLevels } from '@/features/conversations/model/live-wave';

const { LiveWave } = await import('@/features/conversations/components/live-wave');

const live = {
  get: () => ({ seq: 0, values: [] }),
  set: () => undefined,
} as unknown as SharedValue<LiveLevels>;

describe('LiveWave', () => {
  test('is hidden from assistive tech and waits for its width before it draws', () => {
    const { container } = render(<LiveWave live={live} />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(container.querySelector('canvas')).toBeNull();
  });
});
