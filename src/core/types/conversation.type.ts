export const CONVERSATION_DIRECTIONS = ['out', 'in'] as const;

export type ConversationDirection = (typeof CONVERSATION_DIRECTIONS)[number];

export const CONVERSATION_KINDS = ['turn', 'relay', 'reply', 'visitor'] as const;

export type ConversationKind = (typeof CONVERSATION_KINDS)[number];

export const CONVERSATION_LEGS = ['camera', 'phone', 'laptop'] as const;

export type ConversationLeg = (typeof CONVERSATION_LEGS)[number];

export const CONVERSATION_STATES = ['sent', 'delivered', 'notified', 'answered', 'expired', 'received'] as const;

export type ConversationState = (typeof CONVERSATION_STATES)[number];

export type ConversationDeliveryState = Exclude<ConversationState, 'received'>;

export const ARGUS_COUNTERPART_ID = 0;

export type ConversationMessage = {
  id: number;
  userId: number;
  counterpartId: number;
  counterpartName: string;
  direction: ConversationDirection;
  kind: ConversationKind;
  body: string;
  leg: ConversationLeg | null;
  state: ConversationState;
  messageKey: string;
  replyToKey: string | null;
  isRead: boolean;
  readAt: number | null;
  createdAt: number;
  updatedAt: number | null;
  deletedAt: number | null;
};

export type ConversationSummary = {
  counterpartId: number;
  counterpartName: string;
  unread: number;
  last: ConversationMessage;
};

export type ConversationReadResult = {
  updated: number;
};
