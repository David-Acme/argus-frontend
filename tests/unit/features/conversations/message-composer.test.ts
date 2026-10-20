import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONVERSATION_MESSAGE_MAX_CHARS, conversationMessagePath } from '@/core/services/conversation';
import {
  argusAvailability,
  canType,
  charactersOf,
  composerMode,
  sendableMessage,
  submitsOnEnter,
} from '@/features/conversations/model/composer';

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
  test('the Argus thread in chat mode is typed, with or without a microphone', () => {
    expect(composerMode({ argus: true, voiceAllowed: true, voiceSupported: true, assistantMode: 'chat' })).toBe('argus-by-chat');
    expect(composerMode({ argus: true, voiceAllowed: false, voiceSupported: false, assistantMode: 'chat' })).toBe('argus-by-chat');
    expect(composerMode({ argus: true, voiceAllowed: true, voiceSupported: true, assistantMode: 'voice' })).toBe('argus-by-voice');
  });

  test('a member thread ignores the assistant mode', () => {
    expect(composerMode({ argus: false, voiceAllowed: true, voiceSupported: true, assistantMode: 'chat' })).toBe('relay-by-voice');
  });

  test('voice needs both the capability and a microphone, chat follows the thread right', () => {
    expect(argusAvailability({ voiceAllowed: true, voiceSupported: false, chatAllowed: true })).toEqual({ voice: false, chat: true });
    expect(argusAvailability({ voiceAllowed: true, voiceSupported: true, chatAllowed: false })).toEqual({ voice: true, chat: false });
  });
});

describe('typing a message', () => {
  test('a member thread is typed under messages.relay, the Argus thread only in chat mode', () => {
    expect(canType({ argus: false, relayAllowed: true })).toBe(true);
    expect(canType({ argus: false, relayAllowed: false })).toBe(false);
    expect(canType({ argus: true, relayAllowed: true })).toBe(false);
    expect(canType({ argus: true, relayAllowed: true, assistantMode: 'voice' })).toBe(false);
    expect(canType({ argus: true, relayAllowed: true, assistantMode: 'chat' })).toBe(true);
  });

  test('Enter sends on web and the desktop, Shift+Enter and a composing IME do not, and a phone never', () => {
    expect(submitsOnEnter(true, { key: 'Enter' })).toBe(true);
    expect(submitsOnEnter(true, { key: 'Enter', shiftKey: true })).toBe(false);
    expect(submitsOnEnter(true, { key: 'Enter', isComposing: true })).toBe(false);
    expect(submitsOnEnter(true, { key: 'a' })).toBe(false);
    expect(submitsOnEnter(false, { key: 'Enter' })).toBe(false);
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

  const ASSISTANT = read('features/conversations/components/assistant-composer.tsx');
  const CALL = read('features/voice/components/call-surface.tsx');
  const CALL_SCREEN = read('features/voice/screens/call-screen.tsx');

  test('the thread ends in the composer, which sends through the thread hook', () => {
    expect(THREAD).toContain('<MessageComposer name={name} argus={false} onSend={send} />');
    expect(HOOK).toContain('conversationService.send(counterpartId, body)');
    expect(HOOK).toContain('typedMessageIntent(');
  });

  test('the voice shortcut stays beside the text and opens the call with Argus', () => {
    expect(COMPOSER.match(/onPress=\{talk\}/g)).toHaveLength(3);
    expect(COMPOSER).toContain("router.push('/call')");
    expect(COMPOSER).toContain('<Textarea');
    expect(COMPOSER).not.toContain('httpService');
  });

  test('the Argus thread offers the Voz | Chat switch and types through the chat session', () => {
    expect(THREAD).toContain('<AssistantComposer');
    expect(THREAD).toContain("useAssistantChat(argus && assistant.mode === 'chat')");
    expect(THREAD).toContain('<KeyboardAvoidingView');
    expect(ASSISTANT).toContain('<SegmentedControl');
    expect(ASSISTANT).toContain("accessibilityLabel={t('screens.conversations.chat.mode-label')}");
    expect(ASSISTANT).toContain("accessibilityLabel={t('screens.conversations.chat.send')}");
    expect(ASSISTANT).toContain("accessibilityLabel={t('screens.conversations.chat.label')}");
  });

  test('choosing voice opens the call, and the call offers Chat back to the same thread', () => {
    expect(THREAD).toContain("if (mode === 'voice') router.push(ASSISTANT_CALL_HREF);");
    expect(CALL).toContain("label={t('screens.voice.to-chat')}");
    expect(CALL_SCREEN).toContain("rememberAssistantMode('chat');");
    expect(CALL_SCREEN).toContain('router.dismissTo(ASSISTANT_THREAD_HREF)');
  });

  test('the typed draft lives in the chat session, so a round trip to voice keeps it', () => {
    expect(THREAD).toContain('initialDraft={chat.draft}');
    expect(THREAD).toContain('onDraft={chat.setDraft}');
    expect(ASSISTANT).toContain('useState(initialDraft)');
  });

  test('it follows the voice and the relay capabilities and the device microphone', () => {
    expect(COMPOSER).toContain('voiceAllowed: has(CAPABILITY.assistantVoice), voiceSupported: voiceCallSupported()');
    expect(COMPOSER).toContain('relayAllowed: has(CAPABILITY.messagesRelay)');
  });
});
