import { describe, expect, test } from 'bun:test';
import { keyboardTruthStep, watchKeyboardTruth } from '@/shared/libs/keyboard-truth';
import type { KeyboardSources } from '@/shared/libs/keyboard-truth';

type Channel = 'show' | 'hide' | 'leave' | 'return';

function fakeSources() {
  const listeners = new Map<Channel, (() => void)[]>();
  const dismissed: number[] = [];
  const add = (channel: Channel) => (listener: () => void) => {
    listeners.set(channel, [...(listeners.get(channel) ?? []), listener]);
    return {
      remove: () =>
        listeners.set(
          channel,
          (listeners.get(channel) ?? []).filter((kept) => kept !== listener)
        ),
    };
  };
  const sources: KeyboardSources = {
    onShow: add('show'),
    onHide: add('hide'),
    onLeave: add('leave'),
    onReturn: add('return'),
    dismiss: () => dismissed.push(1),
  };
  const fire = (channel: Channel) => (listeners.get(channel) ?? []).forEach((run) => run());
  return { sources, fire, dismissed, listeners };
}

function follow(sources: KeyboardSources) {
  let shown = false;
  const stop = watchKeyboardTruth(sources, (step) => {
    shown = step(shown);
  });
  return { shown: () => shown, stop };
}

describe('the keyboard truth', () => {
  test('a show lifts, a hide or a leave drops, and a return keeps what is known', () => {
    expect(keyboardTruthStep(false, 'show')).toBe(true);
    expect(keyboardTruthStep(true, 'hide')).toBe(false);
    expect(keyboardTruthStep(true, 'leave')).toBe(false);
    expect(keyboardTruthStep(false, 'return')).toBe(false);
    expect(keyboardTruthStep(true, 'return')).toBe(true);
  });

  test('focus lost while the keyboard is up, and no hide ever reported: the composer comes down and stays down on return', () => {
    const { sources, fire, dismissed } = fakeSources();
    const keyboard = follow(sources);
    fire('show');
    expect(keyboard.shown()).toBe(true);
    fire('leave');
    expect(keyboard.shown()).toBe(false);
    expect(dismissed).toHaveLength(1);
    fire('return');
    expect(keyboard.shown()).toBe(false);
    fire('show');
    expect(keyboard.shown()).toBe(true);
  });

  test('stopping removes every listener', () => {
    const { sources, listeners } = fakeSources();
    follow(sources).stop();
    expect([...listeners.values()].every((list) => list.length === 0)).toBe(true);
  });
});
