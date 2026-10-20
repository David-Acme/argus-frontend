import { beforeEach, describe, expect, mock, test } from 'bun:test';

const stored = new Map<string, string>();
let failWrites = false;

mock.module('@/core/services/storage', () => ({
  storageService: {
    getString: (key: string) => stored.get(key) ?? null,
    set: (key: string, value: string) => {
      if (failWrites) throw new Error('storage unavailable');
      stored.set(key, value);
    },
  },
}));

mock.module('@/core/services/log', () => ({
  log: { debug: () => undefined, error: () => undefined },
}));

const {
  assistantEntryHref,
  assistantModes,
  readAssistantMode,
  rememberAssistantMode,
  resolveAssistantMode,
} = await import('@/shared/libs/assistant-mode');
const { ASSISTANT_MODE_STORAGE_KEY } = await import('@/shared/constants');

beforeEach(() => {
  stored.clear();
  failWrites = false;
});

describe('which modes the Argus conversation offers', () => {
  test('voice and chat appear in that order, each only when available', () => {
    expect(assistantModes({ voice: true, chat: true })).toEqual(['voice', 'chat']);
    expect(assistantModes({ voice: false, chat: true })).toEqual(['chat']);
    expect(assistantModes({ voice: true, chat: false })).toEqual(['voice']);
    expect(assistantModes({ voice: false, chat: false })).toEqual([]);
  });
});

describe('the mode a device opens in', () => {
  test('a phone with voice opens by voice until the person picks chat', () => {
    expect(resolveAssistantMode({ voice: true, chat: true, stored: null, native: true })).toBe(
      'voice'
    );
    expect(resolveAssistantMode({ voice: true, chat: true, stored: 'chat', native: true })).toBe(
      'chat'
    );
  });

  test('web and the desktop open in chat unless the person chose voice there', () => {
    expect(resolveAssistantMode({ voice: true, chat: true, stored: null, native: false })).toBe(
      'chat'
    );
    expect(resolveAssistantMode({ voice: true, chat: true, stored: 'voice', native: false })).toBe(
      'voice'
    );
  });

  test('without voice the conversation is typed, whatever was stored', () => {
    expect(resolveAssistantMode({ voice: false, chat: true, stored: 'voice', native: true })).toBe(
      'chat'
    );
  });

  test('a stored chat without the chat right falls back to voice, and nothing at all gives no mode', () => {
    expect(resolveAssistantMode({ voice: true, chat: false, stored: 'chat', native: false })).toBe(
      'voice'
    );
    expect(
      resolveAssistantMode({ voice: false, chat: false, stored: 'chat', native: true })
    ).toBeNull();
  });
});

describe('the assistant entry on Inicio', () => {
  test('voice opens the call and chat opens the Argus thread', () => {
    expect(assistantEntryHref('voice')).toBe('/call');
    expect(assistantEntryHref('chat')).toBe('/conversations/0');
    expect(assistantEntryHref(null)).toBeNull();
  });
});

describe('the choice is remembered on the device', () => {
  test('a chosen mode is read back under the device key', () => {
    expect(readAssistantMode()).toBeNull();
    rememberAssistantMode('chat');
    expect(stored.get(ASSISTANT_MODE_STORAGE_KEY)).toBe('chat');
    expect(readAssistantMode()).toBe('chat');
    rememberAssistantMode('voice');
    expect(readAssistantMode()).toBe('voice');
  });

  test('an unknown stored value reads as no choice, and a storage failure does not throw', () => {
    stored.set(ASSISTANT_MODE_STORAGE_KEY, 'telepathy');
    expect(readAssistantMode()).toBeNull();
    failWrites = true;
    expect(() => rememberAssistantMode('chat')).not.toThrow();
  });
});
