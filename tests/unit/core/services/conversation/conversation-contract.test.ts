import { describe, expect, test } from 'bun:test';
import {
  conversationMessageSchema,
  conversationReadResultSchema,
  voiceNoteContentSchema,
  voiceNotePlayGrantSchema,
} from '@/core/contracts/conversation.contract';

const message = {
  id: 41,
  userId: 7,
  counterpartId: 3,
  counterpartName: 'David',
  direction: 'out',
  kind: 'relay',
  body: 'Ven a comer',
  leg: null,
  state: 'delivered',
  messageKey: 'msg-1',
  replyToKey: null,
  isRead: true,
  readAt: null,
  createdAt: 1_790_000_000,
  updatedAt: null,
  deletedAt: null,
};

describe('the conversation contract', () => {
  test('reads a row as the backend sends it', () => {
    expect(conversationMessageSchema.safeParse(message).success).toBe(true);
    expect(
      conversationMessageSchema.safeParse({ ...message, counterpartId: 0, counterpartName: '', kind: 'turn', leg: 'camera' })
        .success
    ).toBe(true);
  });

  test('refuses a row outside the vocabulary', () => {
    expect(conversationMessageSchema.safeParse({ ...message, state: 'lost' }).success).toBe(false);
    expect(conversationMessageSchema.safeParse({ ...message, leg: 'watch' }).success).toBe(false);
    expect(conversationMessageSchema.safeParse({ ...message, direction: 'up' }).success).toBe(false);
  });

  test('reads the read answer', () => {
    expect(conversationReadResultSchema.safeParse({ updated: 2 }).success).toBe(true);
    expect(conversationReadResultSchema.safeParse({}).success).toBe(false);
  });

  test('reads the receipt and the voice note, and an older row without them reads as none', () => {
    const note = { id: 'c'.repeat(32), mime: 'audio/webm', durationMs: 3100, peaks: [10, 90] };
    const parsed = conversationMessageSchema.parse({ ...message, receipt: 'read', voiceNote: note });
    expect(parsed.receipt).toBe('read');
    expect(parsed.voiceNote).toEqual(note);
    const older = conversationMessageSchema.parse(message);
    expect(older.receipt).toBeNull();
    expect(older.voiceNote).toBeNull();
    expect(conversationMessageSchema.parse({ ...message, receipt: 'seen' }).receipt).toBeNull();
  });

  test('reads the play grant and the one-use content', () => {
    expect(voiceNotePlayGrantSchema.safeParse({ token: 't'.repeat(43), expiresAt: 1_790_000_060 }).success).toBe(true);
    expect(voiceNotePlayGrantSchema.safeParse({ token: '' , expiresAt: 1 }).success).toBe(false);
    expect(
      voiceNoteContentSchema.safeParse({ mimeType: 'audio/ogg', durationMs: 1200, base64: 'T2dnUw==' }).success
    ).toBe(true);
    expect(voiceNoteContentSchema.safeParse({ mimeType: 'audio/ogg', durationMs: 1200 }).success).toBe(false);
  });
});
