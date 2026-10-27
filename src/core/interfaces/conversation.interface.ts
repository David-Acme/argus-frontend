import type {
  ConversationDirection,
  ConversationKind,
  ConversationLeg,
  ConversationResultFrame,
  ConversationState,
  ConversationVia,
} from '@/core/types';

export interface IConversationMessageCacheRow {
  id: string;
  counterpartId: number;
  counterpartName: string;
  direction: ConversationDirection;
  kind: ConversationKind;
  body: string;
  leg: ConversationLeg | null;
  state: ConversationState;
  messageKey: string;
  replyToKey: string | null;
  result: ConversationResultFrame[] | null;
  via: ConversationVia | null;
  isRead: boolean;
  createdAt: number;
}

export interface IConversationSummaryCacheRow {
  counterpartId: number;
  counterpartName: string;
  unread: number;
  last: IConversationMessageCacheRow;
  lastSent: IConversationMessageCacheRow | null;
}

export interface IConversationThreadCache {
  rows: IConversationMessageCacheRow[];
  hasOlder: boolean;
  live: boolean;
}
