import { z } from 'zod';
import {
  CONVERSATION_DIRECTIONS,
  CONVERSATION_KINDS,
  CONVERSATION_LEGS,
  CONVERSATION_RECEIPTS,
  CONVERSATION_STATES,
  VOICE_NOTE_MIMES,
  type ConversationMessage,
  type ConversationReadResult,
  type ConversationVoiceNote,
  type VoiceNoteContent,
  type VoiceNotePlayGrant,
} from '@/core/types';

const unixSeconds = z.number().int().nonnegative();
const counterpart = z.number().int().nonnegative();

export const VOICE_NOTE_PEAKS = 48;

export const VOICE_NOTE_ID = /^[0-9a-f]{32}$/;

export const voiceNoteSchema = z.object({
  id: z.string().regex(VOICE_NOTE_ID),
  mime: z.enum(VOICE_NOTE_MIMES),
  durationMs: z.number().int().nonnegative(),
  peaks: z.array(z.number().int().min(0).max(100)).max(VOICE_NOTE_PEAKS),
}) satisfies z.ZodType<ConversationVoiceNote>;

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
  receipt: z.enum(CONVERSATION_RECEIPTS).nullable().catch(null),
  voiceNote: voiceNoteSchema.nullable().catch(null),
  isRead: z.boolean(),
  readAt: unixSeconds.nullable(),
  createdAt: unixSeconds,
  updatedAt: unixSeconds.nullable(),
  deletedAt: unixSeconds.nullable(),
}) satisfies z.ZodType<ConversationMessage>;

export const conversationReadResultSchema = z.object({
  updated: z.number().int().nonnegative(),
}) satisfies z.ZodType<ConversationReadResult>;

export const voiceNotePlayGrantSchema = z.object({
  token: z.string().min(1),
  expiresAt: unixSeconds,
}) satisfies z.ZodType<VoiceNotePlayGrant>;

export const voiceNoteContentSchema = z.object({
  mimeType: z.string().min(1),
  durationMs: z.number().int().nonnegative(),
  base64: z.string().min(1),
}) satisfies z.ZodType<VoiceNoteContent>;
