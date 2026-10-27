import { describe, expect, test } from 'bun:test';
import {
  CONVERSATION_MESSAGE_MAX_CHARS,
  conversationMessagePath,
} from '@/core/services/conversation';
import {
  charactersOf,
  composerButtonOf,
  sendableMessage,
  showsCounter,
} from '@/features/conversations/model/composer';
import { conversationLayoutOf } from '@/features/conversations/model/conversation-layout';
import { endsSpaceTalk, startsSpaceTalk } from '@/features/conversations/model/space-talk';

const SPACE = {
  key: ' ',
  repeat: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  editing: false,
};

describe('the button beside the field', () => {
  test('the microphone when nothing is typed, send once there are words, stop while listening', () => {
    expect(composerButtonOf({ typed: false, listening: false, canRecord: true })).toBe('mic');
    expect(composerButtonOf({ typed: true, listening: false, canRecord: true })).toBe('send');
    expect(composerButtonOf({ typed: false, listening: true, canRecord: true })).toBe('stop');
  });

  test('without a voice path the button is send', () => {
    expect(composerButtonOf({ typed: false, listening: false, canRecord: false })).toBe('send');
  });
});

describe('typing a message', () => {
  test('the words are sent trimmed, never empty and never past the limit the server enforces', () => {
    expect(sendableMessage('  ¿vienes a comer?  ', 500)).toBe('¿vienes a comer?');
    expect(sendableMessage('   ', 500)).toBeNull();
    expect(sendableMessage('ñññññ', 5)).toBe('ñññññ');
    expect(sendableMessage('ññññññ', 5)).toBeNull();
    expect(charactersOf(' año ')).toBe(3);
    expect(CONVERSATION_MESSAGE_MAX_CHARS).toBe(500);
  });

  test('the counter shows in the last hundred characters', () => {
    expect(showsCounter(400, 500)).toBe(false);
    expect(showsCounter(401, 500)).toBe(true);
  });

  test('it posts to the counterpart thread on argus-notification', () => {
    expect(conversationMessagePath(3)).toBe('/conversation/3/message');
  });
});

describe('the layout and the keyboard on a computer', () => {
  test('three columns from the desktop width, the phone thread below it', () => {
    expect(conversationLayoutOf('compact')).toBe('phone');
    expect(conversationLayoutOf('medium')).toBe('phone');
    expect(conversationLayoutOf('expanded')).toBe('desk');
    expect(conversationLayoutOf('wide')).toBe('desk');
  });

  test('holding Space talks unless a field has focus, a modifier is held or the key repeats', () => {
    expect(startsSpaceTalk(SPACE)).toBe(true);
    expect(startsSpaceTalk({ ...SPACE, editing: true })).toBe(false);
    expect(startsSpaceTalk({ ...SPACE, repeat: true })).toBe(false);
    expect(startsSpaceTalk({ ...SPACE, metaKey: true })).toBe(false);
    expect(startsSpaceTalk({ ...SPACE, key: 'a' })).toBe(false);
    expect(endsSpaceTalk({ key: ' ' }, true)).toBe(true);
    expect(endsSpaceTalk({ key: ' ' }, false)).toBe(false);
  });
});
