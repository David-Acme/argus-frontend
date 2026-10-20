import { log } from '@/core/services/log';
import { storageService } from '@/core/services/storage';
import type { AssistantMode } from '@/core/types';
import {
  ASSISTANT_CALL_HREF,
  ASSISTANT_MODE_STORAGE_KEY,
  ASSISTANT_THREAD_HREF,
} from '@/shared/constants';

export type AssistantAvailability = {
  voice: boolean;
  chat: boolean;
};

export type AssistantModeInput = AssistantAvailability & {
  stored: AssistantMode | null;
  native: boolean;
};

export type AssistantEntryHref = typeof ASSISTANT_CALL_HREF | typeof ASSISTANT_THREAD_HREF;

const listeners = new Set<() => void>();

const isAssistantMode = (value: unknown): value is AssistantMode =>
  value === 'voice' || value === 'chat';

export function assistantModes({ voice, chat }: AssistantAvailability): readonly AssistantMode[] {
  return [...(voice ? (['voice'] as const) : []), ...(chat ? (['chat'] as const) : [])];
}

export function resolveAssistantMode({
  voice,
  chat,
  stored,
  native,
}: AssistantModeInput): AssistantMode | null {
  const available = assistantModes({ voice, chat });
  if (stored !== null && available.includes(stored)) return stored;
  if (voice && (native || !chat)) return 'voice';
  return chat ? 'chat' : null;
}

export function assistantEntryHref(mode: AssistantMode | null): AssistantEntryHref | null {
  if (mode === null) return null;
  return mode === 'voice' ? ASSISTANT_CALL_HREF : ASSISTANT_THREAD_HREF;
}

export function readAssistantMode(): AssistantMode | null {
  try {
    const stored = storageService.getString(ASSISTANT_MODE_STORAGE_KEY);
    return isAssistantMode(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function rememberAssistantMode(mode: AssistantMode): void {
  try {
    storageService.set(ASSISTANT_MODE_STORAGE_KEY, mode);
  } catch (reason) {
    log.debug('assistant-mode', 'the mode was not remembered', reason);
    return;
  }
  for (const listener of listeners) listener();
}

export function subscribeAssistantMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
