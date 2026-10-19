import { z } from 'zod';
import {
  CONVERSATION_DIRECTIONS,
  CONVERSATION_KINDS,
  CONVERSATION_LEGS,
  CONVERSATION_STATES,
  type ConversationMessage,
  type ConversationReadResult,
  type ConversationSummary,
} from '@/core/types';

const unixSeconds = z.number().int().nonnegative();
const counterpart = z.number().int().nonnegative();

export const conversationMessageSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  counterpartId: counterpart,
  counterpartName: z.string(),
  direction: z.enum(CONVERSATION_DIRECTIONS),
  kind: z.enum(CONVERSATION_KINDS),
  body: z.string(),
  leg: z.enum(CONVERSATION_LEGS).nullable(),
  state: z.enum(CONVERSATION_STATES),
  messageKey: z.string(),
  replyToKey: z.string().nullable(),
  isRead: z.boolean(),
  readAt: unixSeconds.nullable(),
  createdAt: unixSeconds,
  updatedAt: unixSeconds.nullable(),
  deletedAt: unixSeconds.nullable(),
}) satisfies z.ZodType<ConversationMessage>;

export const conversationSummarySchema = z.object({
  counterpartId: counterpart,
  counterpartName: z.string(),
  unread: z.number().int().nonnegative(),
  last: conversationMessageSchema,
}) satisfies z.ZodType<ConversationSummary>;

export const conversationListSchema = z.array(conversationSummarySchema);

export const conversationReadResultSchema = z.object({
  updated: z.number().int().nonnegative(),
}) satisfies z.ZodType<ConversationReadResult>;
