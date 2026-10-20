import type { IConversationMessageCacheRow } from '@/core/interfaces';
import { defineLens, type OptimisticIntentInput, type OptimisticLens } from '@/shared/libs/optimistic';

export type TypedMessageValues = {
  isRead: boolean;
  counterpartId: number;
  counterpartName: string;
  body: string;
  createdAt: number;
};

export type TypedMessageDraft = Pick<TypedMessageValues, 'counterpartId' | 'counterpartName' | 'body' | 'createdAt'>;

export function typedMessageRow(
  recordId: string,
  values: Partial<TypedMessageValues>,
  counterpartId: number
): IConversationMessageCacheRow | null {
  if (values.counterpartId !== counterpartId || typeof values.body !== 'string' || values.body.length === 0) return null;
  return {
    id: recordId,
    counterpartId,
    counterpartName: values.counterpartName ?? '',
    direction: 'out',
    kind: 'relay',
    body: values.body,
    leg: null,
    state: 'sent',
    messageKey: '',
    replyToKey: null,
    isRead: true,
    createdAt: values.createdAt ?? 0,
  };
}

const readPatch = (row: IConversationMessageCacheRow, values: Partial<TypedMessageValues>): IConversationMessageCacheRow => ({
  ...row,
  isRead: values.isRead ?? row.isRead,
});

export const CONVERSATION_MESSAGE_LENSES: readonly OptimisticLens<IConversationMessageCacheRow>[] = [
  defineLens<IConversationMessageCacheRow, TypedMessageValues>({
    table: 'conversation_message',
    recordIdOf: (row) => row.id,
    patch: readPatch,
  }),
];

export function conversationLenses(counterpartId: number): readonly OptimisticLens<IConversationMessageCacheRow>[] {
  return [
    defineLens<IConversationMessageCacheRow, TypedMessageValues>({
      table: 'conversation_message',
      recordIdOf: (row) => row.id,
      patch: readPatch,
      create: (recordId, values) => typedMessageRow(recordId, values, counterpartId),
    }),
  ];
}

export function typedMessageIntent(draft: TypedMessageDraft): OptimisticIntentInput<TypedMessageDraft> {
  return { table: 'conversation_message', kind: 'create', values: draft };
}

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
