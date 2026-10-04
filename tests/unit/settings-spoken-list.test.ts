import { describe, expect, test } from 'bun:test';
import { spokenList } from '@/features/settings/model/setting-text';

describe('spokenList', () => {
  test('an empty list says nothing', () => {
    expect(spokenList([], 'y')).toBe('');
  });

  test('one name stands alone', () => {
    expect(spokenList(['Visión'], 'y')).toBe('Visión');
  });

  test('two names are joined by the conjunction', () => {
    expect(spokenList(['Asistente', 'Visión'], 'y')).toBe('Asistente y Visión');
  });

  test('the conjunction only joins the last name', () => {
    expect(spokenList(['Asistente', 'Conversación', 'Transcripción', 'Visión'], 'and')).toBe(
      'Asistente, Conversación, Transcripción and Visión',
    );
  });
});
