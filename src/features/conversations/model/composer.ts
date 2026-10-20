export type ComposerMode = 'relay-by-voice' | 'argus-by-voice' | 'no-voice';

export type ComposerInput = {
  argus: boolean;
  voiceAllowed: boolean;
  voiceSupported: boolean;
};

export type TypingInput = {
  argus: boolean;
  relayAllowed: boolean;
};

export function composerMode({ argus, voiceAllowed, voiceSupported }: ComposerInput): ComposerMode {
  if (!voiceAllowed || !voiceSupported) return 'no-voice';
  return argus ? 'argus-by-voice' : 'relay-by-voice';
}

export function canType({ argus, relayAllowed }: TypingInput): boolean {
  return !argus && relayAllowed;
}

export function sendableMessage(draft: string, maxChars: number): string | null {
  const body = draft.trim();
  if (body.length === 0 || [...body].length > maxChars) return null;
  return body;
}

export function charactersOf(draft: string): number {
  return [...draft.trim()].length;
}
