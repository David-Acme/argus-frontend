import { useEffect, useSyncExternalStore } from 'react';
import type { AssistantChatSnapshot } from '@/core/types';
import { useAuthStore } from '@/core/stores';
import { assistantChat } from '@/features/voice/services/chat';
import type { AssistantChatSend } from '@/features/voice/services/chat/assistant-chat';

export type AssistantChatState = AssistantChatSnapshot & {
  busy: boolean;
  readDraft: () => string;
  setDraft: (draft: string) => void;
  send: (draft: string) => AssistantChatSend;
  retry: (clientId: string) => void;
  dismiss: (clientId: string) => void;
};

const subscribe = (listener: () => void): (() => void) => assistantChat.subscribe(listener);

const getSnapshot = (): AssistantChatSnapshot => assistantChat.snapshot;

const send = (draft: string): AssistantChatSend => assistantChat.send(draft);

const retry = (clientId: string): void => assistantChat.retry(clientId);

const dismiss = (clientId: string): void => assistantChat.dismiss(clientId);

const readDraft = (): string => assistantChat.draft;

const setDraft = (draft: string): void => assistantChat.setDraft(draft);

export function useAssistantChat(active: boolean): AssistantChatState {
  const userId = useAuthStore((state) => (state.user ? String(state.user.id) : null));
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    assistantChat.bindUser(userId);
  }, [userId]);

  useEffect(() => {
    if (!active) return;
    assistantChat.open();
    return () => assistantChat.close();
  }, [active]);

  const busy = snapshot.entries.some(
    (entry) => entry.status === 'waiting' || entry.status === 'sending'
  );

  return { ...snapshot, busy, readDraft, setDraft, send, retry, dismiss };
}
