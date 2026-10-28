import { describe, expect, test } from 'bun:test';
import { size } from '@/shared/theme/tokens';
import { emptyMarkSizeOf } from '@/features/conversations/model/conversation-layout';

describe('the Estela of an empty thread', () => {
  test('scales down with the window height and on a phone on its side', () => {
    expect(emptyMarkSizeOf('regular', false)).toBe(size.presenceThreadEmpty);
    expect(emptyMarkSizeOf('short', false)).toBe(size.presenceWelcomeTiny);
    expect(emptyMarkSizeOf('tiny', false)).toBe(size.presenceMark);
    expect(emptyMarkSizeOf('regular', true)).toBe(size.presenceMark);
  });
});
