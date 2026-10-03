import { describe, expect, test } from 'bun:test';
import {
  parseAssistantText,
  parseSttFrame,
  parseTurnId,
  parseVoiceError,
} from '@/features/voice/services/voice/voice-frames';

describe('parseTurnId', () => {
  test('numeric and string ids normalise to strings', () => {
    expect(parseTurnId({ id: 7 })).toBe('7');
    expect(parseTurnId({ id: 'a1' })).toBe('a1');
  });

  test('a missing, empty or non-finite id is no turn', () => {
    expect(parseTurnId({})).toBeNull();
    expect(parseTurnId({ id: '' })).toBeNull();
    expect(parseTurnId({ id: Number.NaN })).toBeNull();
    expect(parseTurnId(null)).toBeNull();
    expect(parseTurnId('7')).toBeNull();
  });
});

describe('parseSttFrame', () => {
  test('final defaults to false unless it is exactly true', () => {
    expect(parseSttFrame({ text: 'hola' })).toEqual({ text: 'hola', final: false });
    expect(parseSttFrame({ text: 'hola', final: true })).toEqual({ text: 'hola', final: true });
    expect(parseSttFrame({ text: 'hola', final: 'true' })).toEqual({ text: 'hola', final: false });
  });

  test('a frame without text is rejected', () => {
    expect(parseSttFrame({ final: true })).toBeNull();
    expect(parseSttFrame(undefined)).toBeNull();
  });
});

describe('parseAssistantText', () => {
  test('returns the text field or null', () => {
    expect(parseAssistantText({ text: 'Hola.' })).toBe('Hola.');
    expect(parseAssistantText({ text: 3 })).toBeNull();
  });
});

describe('parseVoiceError', () => {
  test('prefers the server error, falls back to the status', () => {
    expect(parseVoiceError({ error: 'VOICE_BUSY|busy' })).toBe('VOICE_BUSY|busy');
    expect(parseVoiceError({ status: 503 })).toBe('VOICE_ERROR|503');
    expect(parseVoiceError(null)).toBe('VOICE_ERROR|');
  });
});
