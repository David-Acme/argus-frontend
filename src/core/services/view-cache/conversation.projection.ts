import type { ConversationMessageModel } from '@/core/database';
import type {
  IConversationMessageCacheRow,
  IConversationSummaryCacheRow,
  IConversationThreadCache,
} from '@/core/interfaces';
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
  | 'result'
  | 'via'
  | 'isRead'
  | 'createdAt'
>;

export type ConversationSummaryFacts = {
  counterpartId: string;
  last: ConversationMessageSource;
  lastSent: ConversationMessageSource | null;
  lastNamed: ConversationMessageSource | null;
  unread: number;
};

export type ConversationProjectionInput = {
  summaries: readonly ConversationSummaryFacts[];
};

export type ConversationThreadInput = {
  rows: readonly ConversationMessageSource[];
  older: boolean;
  live: boolean;
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
  result: message.result ?? null,
  via: message.via ?? null,
  isRead: message.isRead,
  createdAt: message.createdAt.getTime(),
});

export const compareMessages = (left: IConversationMessageCacheRow, right: IConversationMessageCacheRow): number =>
  left.createdAt - right.createdAt || Number(left.id) - Number(right.id) || left.id.localeCompare(right.id);

export function summaryOf(facts: ConversationSummaryFacts): IConversationSummaryCacheRow {
  return {
    counterpartId: counterpartOf(facts.counterpartId),
    counterpartName: facts.lastNamed?.counterpartName.trim() ?? '',
    unread: facts.unread,
    last: toConversationRow(facts.last),
    lastSent: facts.lastSent ? toConversationRow(facts.lastSent) : null,
  };
}

export const compareSummaries = (left: IConversationSummaryCacheRow, right: IConversationSummaryCacheRow): number => {
  const leftArgus = left.counterpartId === ARGUS_COUNTERPART_ID;
  const rightArgus = right.counterpartId === ARGUS_COUNTERPART_ID;
  if (leftArgus !== rightArgus) return leftArgus ? -1 : 1;
  return compareMessages(right.last, left.last);
};

export function projectConversations({ summaries }: ConversationProjectionInput): ViewWrite[] {
  const list = summaries.map(summaryOf).sort(compareSummaries);
  return [
    { key: VIEW_CACHE_KEYS.conversationList, rows: list, limit: VIEW_CACHE_LIST_LIMIT },
  ];
}

export function projectConversationThread(
  { rows, older, live }: ConversationThreadInput,
  scope: string
): ViewWrite[] {
  const thread: IConversationThreadCache = {
    rows: rows.map(toConversationRow).sort(compareMessages),
    hasOlder: older,
    live,
  };
  return [{ key: VIEW_CACHE_KEYS.conversationThread, scope, value: thread }];
}
