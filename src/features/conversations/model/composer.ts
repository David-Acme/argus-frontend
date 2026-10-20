import type { AssistantMode } from '@/core/types';

export type ComposerMode = 'relay-by-voice' | 'argus-by-voice' | 'argus-by-chat' | 'no-voice';

export type ComposerInput = {
  argus: boolean;
  voiceAllowed: boolean;
  voiceSupported: boolean;
  assistantMode?: AssistantMode | null;
};

export type TypingInput = {
  argus: boolean;
  relayAllowed: boolean;
  assistantMode?: AssistantMode | null;
};

export type ArgusAvailabilityInput = {
  voiceAllowed: boolean;
  voiceSupported: boolean;
  chatAllowed: boolean;
};

export function composerMode({
  argus,
  voiceAllowed,
  voiceSupported,
  assistantMode = null,
}: ComposerInput): ComposerMode {
  if (argus && assistantMode === 'chat') return 'argus-by-chat';
  if (!voiceAllowed || !voiceSupported) return 'no-voice';
  return argus ? 'argus-by-voice' : 'relay-by-voice';
}

export function canType({ argus, relayAllowed, assistantMode = null }: TypingInput): boolean {
  if (argus) return assistantMode === 'chat';
  return relayAllowed;
}

export function argusAvailability({
  voiceAllowed,
  voiceSupported,
  chatAllowed,
}: ArgusAvailabilityInput) {
  return { voice: voiceAllowed && voiceSupported, chat: chatAllowed };
}

export function sendableMessage(draft: string, maxChars: number): string | null {
  const body = draft.trim();
  if (body.length === 0 || [...body].length > maxChars) return null;
  return body;
}

export function charactersOf(draft: string): number {
  return [...draft.trim()].length;
}

export function submitsOnEnter(
  web: boolean,
  key: { key: string; shiftKey?: boolean; isComposing?: boolean }
): boolean {
  return web && key.key === 'Enter' && key.shiftKey !== true && key.isComposing !== true;
}
