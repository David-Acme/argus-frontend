import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONVERSATION_MESSAGE_MAX_CHARS, conversationMessagePath } from '@/core/services/conversation';
import { canType, charactersOf, composerMode, sendableMessage } from '@/features/conversations/model/composer';

const read = (path: string) => readFileSync(join(import.meta.dir, '../../../../src', path), 'utf8');

describe('the composer mode', () => {
  test('a member thread can also be reached by voice through Argus', () => {
    expect(composerMode({ argus: false, voiceAllowed: true, voiceSupported: true })).toBe('relay-by-voice');
  });

  test('the Argus thread is a conversation by voice', () => {
    expect(composerMode({ argus: true, voiceAllowed: true, voiceSupported: true })).toBe('argus-by-voice');
  });

  test('without the voice capability or a microphone there is no voice shortcut', () => {
    expect(composerMode({ argus: false, voiceAllowed: false, voiceSupported: true })).toBe('no-voice');
    expect(composerMode({ argus: true, voiceAllowed: true, voiceSupported: false })).toBe('no-voice');
  });
});

describe('typing a message', () => {
  test('a member thread is typed under messages.relay, the Argus thread never', () => {
    expect(canType({ argus: false, relayAllowed: true })).toBe(true);
    expect(canType({ argus: false, relayAllowed: false })).toBe(false);
    expect(canType({ argus: true, relayAllowed: true })).toBe(false);
  });

  test('the words are sent trimmed, never empty and never past the limit the server enforces', () => {
    expect(sendableMessage('  ¿vienes a comer?  ', 500)).toBe('¿vienes a comer?');
    expect(sendableMessage('   ', 500)).toBeNull();
    expect(sendableMessage('ñññññ', 5)).toBe('ñññññ');
    expect(sendableMessage('ññññññ', 5)).toBeNull();
    expect(charactersOf(' año ')).toBe(3);
    expect(CONVERSATION_MESSAGE_MAX_CHARS).toBe(500);
  });

  test('it posts to the counterpart thread on argus-notification', () => {
    expect(conversationMessagePath(3)).toBe('/conversation/3/message');
  });
});

describe('the composer in the thread', () => {
  const THREAD = read('features/conversations/screens/conversation-thread-screen.tsx');
  const COMPOSER = read('features/conversations/components/message-composer.tsx');
  const HOOK = read('features/conversations/hooks/use-conversation-thread.ts');

  test('the thread ends in the composer, which sends through the thread hook', () => {
    expect(THREAD).toContain('<MessageComposer name={name} argus={argus} onSend={send} />');
    expect(HOOK).toContain('conversationService.send(counterpartId, body)');
    expect(HOOK).toContain('typedMessageIntent(');
  });

  test('the voice shortcut stays beside the text and opens the call with Argus', () => {
    expect(COMPOSER.match(/onPress=\{talk\}/g)).toHaveLength(3);
    expect(COMPOSER).toContain("router.push('/call')");
    expect(COMPOSER).toContain('<Textarea');
    expect(COMPOSER).not.toContain('httpService');
  });

  test('it follows the voice and the relay capabilities and the device microphone', () => {
    expect(COMPOSER).toContain('voiceAllowed: has(CAPABILITY.assistantVoice), voiceSupported: voiceCallSupported()');
    expect(COMPOSER).toContain('relayAllowed: has(CAPABILITY.messagesRelay)');
  });
});
