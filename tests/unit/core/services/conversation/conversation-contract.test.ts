import { describe, expect, test } from 'bun:test';
import { conversationMessageSchema, conversationReadResultSchema } from '@/core/contracts/conversation.contract';

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
});
