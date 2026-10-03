import type { VoiceTranscriptLine } from '@/core/types';

export type UserLineInput = {
  id: string;
  text: string;
};

export type AssistantTextInput = {
  turnKey: string;
  text: string;
};

function capped(lines: VoiceTranscriptLine[], limit: number): readonly VoiceTranscriptLine[] {
  return lines.length > limit ? lines.slice(lines.length - limit) : lines;
}

export function mergeAssistantText(previous: string, next: string): string {
  const incoming = next.trim();
  if (!previous) return incoming;
  if (!incoming) return previous;
  if (incoming.startsWith(previous)) return incoming;
  return `${previous} ${incoming}`;
}

export function appendUserLine(
  lines: readonly VoiceTranscriptLine[],
  input: UserLineInput,
  limit: number,
): readonly VoiceTranscriptLine[] {
  const text = input.text.trim();
  if (!text) return lines;
  return capped([...lines, { id: input.id, role: 'user', text }], limit);
}

export function appendAssistantText(
  lines: readonly VoiceTranscriptLine[],
  input: AssistantTextInput,
  limit: number,
): readonly VoiceTranscriptLine[] {
  const id = `assistant-${input.turnKey}`;
  const index = lines.findLastIndex((line) => line.id === id);
  if (index === -1) {
    const text = input.text.trim();
    if (!text) return lines;
    return capped([...lines, { id, role: 'assistant', text }], limit);
  }
  const current = lines[index];
  if (!current) return lines;
  const text = mergeAssistantText(current.text, input.text);
  if (text === current.text) return lines;
  const next = lines.slice();
  next[index] = { ...current, text };
  return next;
}

export function lastAssistantText(lines: readonly VoiceTranscriptLine[]): string {
  return lines.findLast((line) => line.role === 'assistant')?.text ?? '';
}
