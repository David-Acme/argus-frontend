import type { ConversationMessageModel } from '@/core/database';
import type { IConversationMessageCacheRow, IConversationSummaryCacheRow } from '@/core/interfaces';
import { ARGUS_COUNTERPART_ID } from '@/core/types';
import { VIEW_CACHE_KEYS, VIEW_CACHE_LIST_LIMIT } from '@/shared/constants/cache.constant';
import type { ViewWrite } from './projection';

export type ConversationMessageSource = Pick<
  ConversationMessageModel,
  | 'id'
  | 'counterpartId'
  | 'counterpartName'
  | 'direction'
  | 'kind'
  | 'body'
  | 'leg'
  | 'state'
  | 'messageKey'
  | 'replyToKey'
  | 'isRead'
  | 'createdAt'
>;

export type ConversationProjectionInput = {
  conversations: readonly ConversationMessageSource[];
};

const counterpartOf = (raw: string): number => {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id >= 0 ? id : ARGUS_COUNTERPART_ID;
};

export const toConversationRow = (message: ConversationMessageSource): IConversationMessageCacheRow => ({
  id: message.id,
  counterpartId: counterpartOf(message.counterpartId),
  counterpartName: message.counterpartName,
  direction: message.direction,
  kind: message.kind,
  body: message.body,
  leg: message.leg ?? null,
  state: message.state,
  messageKey: message.messageKey,
  replyToKey: message.replyToKey ?? null,
  isRead: message.isRead,
  createdAt: message.createdAt.getTime(),
});

export const compareMessages = (left: IConversationMessageCacheRow, right: IConversationMessageCacheRow): number =>
  left.createdAt - right.createdAt || Number(left.id) - Number(right.id) || left.id.localeCompare(right.id);

export const isUnreadMessage = (message: Pick<IConversationMessageCacheRow, 'direction' | 'isRead'>): boolean =>
  message.direction === 'in' && !message.isRead;

export const isSentMessage = (message: Pick<IConversationMessageCacheRow, 'direction' | 'kind'>): boolean =>
  message.direction === 'out' && (message.kind === 'relay' || message.kind === 'reply');

export function groupThreads(
  rows: readonly IConversationMessageCacheRow[]
): Map<number, IConversationMessageCacheRow[]> {
  const threads = new Map<number, IConversationMessageCacheRow[]>();
  for (const row of [...rows].sort(compareMessages)) {
    const thread = threads.get(row.counterpartId);
    if (thread) thread.push(row);
    else threads.set(row.counterpartId, [row]);
  }
  return threads;
}

const nameOf = (messages: readonly IConversationMessageCacheRow[]): string =>
  [...messages].reverse().find((message) => message.counterpartName.trim().length > 0)?.counterpartName.trim() ?? '';

export function summarizeThread(
  counterpartId: number,
  messages: readonly IConversationMessageCacheRow[]
): IConversationSummaryCacheRow | null {
  const last = messages[messages.length - 1];
  if (!last) return null;
  return {
    counterpartId,
    counterpartName: nameOf(messages),
    unread: messages.filter(isUnreadMessage).length,
    last,
    lastSent: [...messages].reverse().find(isSentMessage) ?? null,
  };
}

export const compareSummaries = (left: IConversationSummaryCacheRow, right: IConversationSummaryCacheRow): number => {
  const leftArgus = left.counterpartId === ARGUS_COUNTERPART_ID;
  const rightArgus = right.counterpartId === ARGUS_COUNTERPART_ID;
  if (leftArgus !== rightArgus) return leftArgus ? -1 : 1;
  return compareMessages(right.last, left.last);
};

export function summarizeConversations(
  threads: ReadonlyMap<number, readonly IConversationMessageCacheRow[]>
): IConversationSummaryCacheRow[] {
  return [...threads]
    .flatMap(([counterpartId, messages]) => summarizeThread(counterpartId, messages) ?? [])
    .sort(compareSummaries);
}

export function projectConversations({ conversations }: ConversationProjectionInput): ViewWrite[] {
  const threads = groupThreads(conversations.map(toConversationRow));
  const summaries = summarizeConversations(threads);
  return [
    { key: VIEW_CACHE_KEYS.conversationList, rows: summaries, limit: VIEW_CACHE_LIST_LIMIT },
    { key: VIEW_CACHE_KEYS.conversationUnread, value: summaries.reduce((total, summary) => total + summary.unread, 0) },
    ...[...threads].map(
      ([counterpartId, messages]): ViewWrite => ({
        key: VIEW_CACHE_KEYS.conversationThread,
        scope: String(counterpartId),
        rows: messages.slice(-VIEW_CACHE_LIST_LIMIT),
        limit: VIEW_CACHE_LIST_LIMIT,
      })
    ),
  ];
}
