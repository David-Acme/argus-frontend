import { describe, expect, test } from 'bun:test';
import { sectionShortcut, type ShortcutEvent } from '@/features/navigation/model/section-shortcut';

const press = (key: string, patch: Partial<ShortcutEvent> = {}): ShortcutEvent => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  target: { tagName: 'DIV' },
  ...patch,
});

describe('sectionShortcut', () => {
  test('1 to the tab count pick a section by position', () => {
    expect(sectionShortcut(press('1'), 5)).toBe(0);
    expect(sectionShortcut(press('5'), 5)).toBe(4);
    expect(sectionShortcut(press('4'), 3)).toBeNull();
    expect(sectionShortcut(press('0'), 5)).toBeNull();
    expect(sectionShortcut(press('a'), 5)).toBeNull();
  });

  test('typing in a field, a modifier or a handled key never switches', () => {
    expect(sectionShortcut(press('1', { target: { tagName: 'input' } }), 5)).toBeNull();
    expect(sectionShortcut(press('1', { target: { tagName: 'TEXTAREA' } }), 5)).toBeNull();
    expect(sectionShortcut(press('1', { target: { isContentEditable: true } }), 5)).toBeNull();
    expect(sectionShortcut(press('1', { metaKey: true }), 5)).toBeNull();
    expect(sectionShortcut(press('1', { ctrlKey: true }), 5)).toBeNull();
    expect(sectionShortcut(press('1', { altKey: true }), 5)).toBeNull();
    expect(sectionShortcut(press('1', { defaultPrevented: true }), 5)).toBeNull();
    expect(sectionShortcut(press('1', { isComposing: true }), 5)).toBeNull();
    expect(sectionShortcut(press('2', { target: null }), 5)).toBe(1);
  });
});
