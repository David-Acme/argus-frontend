import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { composerMode } from '@/features/conversations/model/composer';

const read = (path: string) => readFileSync(join(import.meta.dir, '../../../../src', path), 'utf8');

describe('the composer mode', () => {
  test('a member thread is written by voice through Argus', () => {
    expect(composerMode({ argus: false, voiceAllowed: true, voiceSupported: true })).toBe('relay-by-voice');
  });

  test('the Argus thread is a conversation by voice', () => {
    expect(composerMode({ argus: true, voiceAllowed: true, voiceSupported: true })).toBe('argus-by-voice');
  });

  test('without the voice capability or a microphone there is nothing to press', () => {
    expect(composerMode({ argus: false, voiceAllowed: false, voiceSupported: true })).toBe('no-voice');
    expect(composerMode({ argus: true, voiceAllowed: true, voiceSupported: false })).toBe('no-voice');
  });
});

describe('the composer in the thread', () => {
  const THREAD = read('features/conversations/screens/conversation-thread-screen.tsx');
  const COMPOSER = read('features/conversations/components/message-composer.tsx');

  test('the thread ends in the composer', () => {
    expect(THREAD).toContain('<MessageComposer name={name} argus={argus} />');
  });

  test('it opens the call with Argus and sends nothing over HTTP', () => {
    expect(COMPOSER.match(/onPress=\{talk\}/g)).toHaveLength(2);
    expect(COMPOSER).toContain("router.push('/call')");
    expect(COMPOSER).not.toContain('httpService');
    expect(COMPOSER).not.toContain('TextInput');
  });

  test('it follows the voice capability and the device microphone', () => {
    expect(COMPOSER).toContain('voiceAllowed: has(CAPABILITY.assistantVoice), voiceSupported: voiceCallSupported()');
  });
});
