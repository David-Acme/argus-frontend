import type { IConversationMessageCacheRow } from '@/core/interfaces';
import { defineLens, type OptimisticIntentInput, type OptimisticLens } from '@/shared/libs/optimistic';

export const CONVERSATION_MESSAGE_LENSES: readonly OptimisticLens<IConversationMessageCacheRow>[] = [
  defineLens<IConversationMessageCacheRow, { isRead: boolean }>({
    table: 'conversation_message',
    recordIdOf: (row) => row.id,
    patch: (row, values) => ({ ...row, isRead: values.isRead ?? row.isRead }),
  }),
];

export function conversationReadIntents(ids: readonly string[]): OptimisticIntentInput[] {
  return ids.map((recordId) => ({
    table: 'conversation_message',
    kind: 'update',
    recordId,
    values: { isRead: true },
  }));
}

export function conversationClearIntents(
  messages: readonly Pick<IConversationMessageCacheRow, 'id'>[]
): OptimisticIntentInput[] {
  return messages.map((message) => ({ table: 'conversation_message', kind: 'delete', recordId: message.id }));
}
