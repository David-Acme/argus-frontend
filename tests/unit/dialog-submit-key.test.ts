import { describe, expect, test } from 'bun:test';
import { submitsDialog } from '@/shared/components/ui/dialog-submit-key';

function element(tagName: string, role: string | null = null) {
  return { tagName, getAttribute: (name: string) => (name === 'role' ? role : null) };
}

function enter(target: unknown, keys: Partial<Record<'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey', boolean>> = {}) {
  return {
    key: 'Enter',
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    target,
    ...keys,
  };
}

describe('submitsDialog', () => {
  test('Enter in a text field submits the dialog', () => {
    expect(submitsDialog(enter(element('input')))).toBe(true);
    expect(submitsDialog(enter(element('DIV')))).toBe(true);
  });

  test('a note takes newlines and submits only with Ctrl or Cmd', () => {
    expect(submitsDialog(enter(element('TEXTAREA')))).toBe(false);
    expect(submitsDialog(enter(element('TEXTAREA'), { ctrlKey: true }))).toBe(true);
    expect(submitsDialog(enter(element('textarea'), { metaKey: true }))).toBe(true);
  });

  test('controls that Enter activates keep their own meaning', () => {
    expect(submitsDialog(enter(element('BUTTON')))).toBe(false);
    expect(submitsDialog(enter(element('A')))).toBe(false);
    for (const role of ['button', 'switch', 'checkbox', 'radio', 'menuitem', 'tab', 'combobox', 'option', 'link']) {
      expect(submitsDialog(enter(element('DIV', role)))).toBe(false);
    }
  });

  test('other keys, modifiers, composition and handled events never submit', () => {
    expect(submitsDialog({ ...enter(element('INPUT')), key: 'a' })).toBe(false);
    expect(submitsDialog(enter(element('INPUT'), { shiftKey: true }))).toBe(false);
    expect(submitsDialog(enter(element('INPUT'), { altKey: true }))).toBe(false);
    expect(submitsDialog({ ...enter(element('INPUT')), isComposing: true })).toBe(false);
    expect(submitsDialog({ ...enter(element('INPUT')), defaultPrevented: true })).toBe(false);
  });

  test('an unknown target is treated as the dialog itself', () => {
    expect(submitsDialog(enter(null))).toBe(true);
    expect(submitsDialog(enter('text'))).toBe(true);
  });
});
