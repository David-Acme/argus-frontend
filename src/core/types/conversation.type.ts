export const CONVERSATION_DIRECTIONS = ['out', 'in'] as const;

export type ConversationDirection = (typeof CONVERSATION_DIRECTIONS)[number];

export const CONVERSATION_KINDS = ['turn', 'relay', 'reply', 'visitor'] as const;

export type ConversationKind = (typeof CONVERSATION_KINDS)[number];

export const CONVERSATION_LEGS = ['camera', 'phone', 'laptop'] as const;

export type ConversationLeg = (typeof CONVERSATION_LEGS)[number];

export const CONVERSATION_STATES = ['sent', 'delivered', 'notified', 'answered', 'expired', 'received'] as const;

export type ConversationState = (typeof CONVERSATION_STATES)[number];

export type ConversationDeliveryState = Exclude<ConversationState, 'received'>;

export const CONVERSATION_VIAS = ['voice', 'text'] as const;

export type ConversationVia = (typeof CONVERSATION_VIAS)[number];

export const CONVERSATION_RECEIPTS = ['sent', 'delivered', 'read'] as const;

export type ConversationReceipt = (typeof CONVERSATION_RECEIPTS)[number];

export const VOICE_NOTE_MIMES = ['audio/ogg', 'audio/webm', 'audio/mp4', 'audio/aac'] as const;

export type VoiceNoteMime = (typeof VOICE_NOTE_MIMES)[number];

export type ConversationVoiceNote = {
  id: string;
  mime: VoiceNoteMime;
  durationMs: number;
  peaks: number[];
};

export type ConversationResultFrame = {
  id: string;
  tool: string;
  ok: boolean;
  data: Record<string, unknown>;
};

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
  receipt: ConversationReceipt | null;
  voiceNote: ConversationVoiceNote | null;
  isRead: boolean;
  readAt: number | null;
  createdAt: number;
  updatedAt: number | null;
  deletedAt: number | null;
};

export type ConversationReadResult = {
  updated: number;
};

export type VoiceNotePlayGrant = {
  token: string;
  expiresAt: number;
};

export type VoiceNoteContent = {
  mimeType: string;
  durationMs: number;
  base64: string;
};
