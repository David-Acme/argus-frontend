export type ComposerButton = 'send' | 'mic' | 'stop';

export type ComposerButtonInput = {
  typed: boolean;
  listening: boolean;
  canListen: boolean;
};

export function composerButtonOf({
  typed,
  listening,
  canListen,
}: ComposerButtonInput): ComposerButton {
  if (listening) return 'stop';
  if (typed || !canListen) return 'send';
  return 'mic';
}

export function sendableMessage(draft: string, maxChars: number): string | null {
  const body = draft.trim();
  if (body.length === 0 || [...body].length > maxChars) return null;
  return body;
}

export function charactersOf(draft: string): number {
  return [...draft.trim()].length;
}

export const COUNTER_WINDOW = 100;

export function showsCounter(characters: number, maxChars: number): boolean {
  return characters > maxChars - COUNTER_WINDOW;
}
