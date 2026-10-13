import { describe, expect, test } from 'bun:test';
import {
  appendAssistantText,
  appendUserLine,
  correctLastUserLine,
  lastAssistantText,
  mergeAssistantText,
  UNHEARD_TEXT,
} from '@/features/voice/services/voice/voice-transcript';

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

describe('a transcript correction', () => {
  test('replaces the latest user line in place and adds no line', () => {
    let lines = appendUserLine([], { id: 'user-1', text: 'abre el patio' }, 10);
    lines = appendAssistantText(lines, { turnKey: 'turn-1', text: 'Abierto.' }, 10);
    lines = appendUserLine(lines, { id: 'user-2', text: 'rojo verde azul' }, 10);
    const corrected = correctLastUserLine(lines, UNHEARD_TEXT);
    expect(corrected.replaced).toBe('rojo verde azul');
    expect(corrected.lines).toEqual([
      { id: 'user-1', role: 'user', text: 'abre el patio' },
      { id: 'assistant-turn-1', role: 'assistant', text: 'Abierto.' },
      { id: 'user-2', role: 'user', text: UNHEARD_TEXT },
    ]);
    expect(JSON.stringify(corrected.lines)).not.toContain('rojo verde azul');
  });

  test('with no user line yet there is nothing to correct', () => {
    const lines = appendAssistantText([], { turnKey: 'turn-1', text: 'Hola.' }, 10);
    const corrected = correctLastUserLine(lines, UNHEARD_TEXT);
    expect(corrected.replaced).toBeNull();
    expect(corrected.lines).toBe(lines);
  });

  test('a blank correction still removes the words', () => {
    const lines = appendUserLine([], { id: 'user-1', text: 'rojo verde azul' }, 10);
    expect(correctLastUserLine(lines, '  ').lines).toEqual([{ id: 'user-1', role: 'user', text: UNHEARD_TEXT }]);
  });
});

