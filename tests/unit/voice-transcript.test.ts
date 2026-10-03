import { describe, expect, test } from 'bun:test';
import {
  appendAssistantText,
  appendUserLine,
  lastAssistantText,
  mergeAssistantText,
} from '@/core/services/voice/voice-transcript';

describe('mergeAssistantText', () => {
  test('sentence deltas are joined with a space', () => {
    expect(mergeAssistantText('Hola.', 'Soy Argus.')).toBe('Hola. Soy Argus.');
  });

  test('a cumulative text replaces the previous one', () => {
    expect(mergeAssistantText('Hola.', 'Hola. Soy Argus.')).toBe('Hola. Soy Argus.');
  });
});

describe('transcript accumulation', () => {
  test('assistant text accumulates per turn and a new turn opens a new line', () => {
    let lines = appendUserLine([], { id: 'user-1', text: ' qué hora es ' }, 10);
    lines = appendAssistantText(lines, { turnKey: 'turn-1', text: 'Son las diez.' }, 10);
    lines = appendAssistantText(lines, { turnKey: 'turn-1', text: 'Buenas noches.' }, 10);
    lines = appendUserLine(lines, { id: 'user-2', text: 'gracias' }, 10);
    lines = appendAssistantText(lines, { turnKey: 'turn-2', text: 'De nada.' }, 10);
    expect(lines).toEqual([
      { id: 'user-1', role: 'user', text: 'qué hora es' },
      { id: 'assistant-turn-1', role: 'assistant', text: 'Son las diez. Buenas noches.' },
      { id: 'user-2', role: 'user', text: 'gracias' },
      { id: 'assistant-turn-2', role: 'assistant', text: 'De nada.' },
    ]);
    expect(lastAssistantText(lines)).toBe('De nada.');
  });

  test('late text of an earlier turn lands on that turn line', () => {
    let lines = appendAssistantText([], { turnKey: 'turn-1', text: 'Uno.' }, 10);
    lines = appendUserLine(lines, { id: 'user-1', text: 'espera' }, 10);
    lines = appendAssistantText(lines, { turnKey: 'turn-1', text: 'Dos.' }, 10);
    expect(lines.map((line) => line.text)).toEqual(['Uno. Dos.', 'espera']);
  });

  test('empty text adds nothing and the list is capped from the front', () => {
    expect(appendUserLine([], { id: 'user-1', text: '   ' }, 10)).toEqual([]);
    let lines = appendUserLine([], { id: 'user-1', text: 'a' }, 2);
    lines = appendUserLine(lines, { id: 'user-2', text: 'b' }, 2);
    lines = appendUserLine(lines, { id: 'user-3', text: 'c' }, 2);
    expect(lines.map((line) => line.id)).toEqual(['user-2', 'user-3']);
  });
});
