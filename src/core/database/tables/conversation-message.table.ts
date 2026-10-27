import { Model, tableSchema } from '@nozbe/watermelondb';
import { date, field, json, text } from '@nozbe/watermelondb/decorators';
import type {
  ConversationDirection,
  ConversationKind,
  ConversationLeg,
  ConversationResultFrame,
  ConversationState,
  ConversationVia,
} from '@/core/types';
import { sanitizeResultFrames } from './sanitizers';

export const CONVERSATION_THREAD_INDEX_SQL =
  'create index if not exists "conversation_message_thread" on "conversation_message" ("user_id", "counterpart_id", "created_at");';

export const CONVERSATION_MESSAGE_SCHEMA = tableSchema({
  name: 'conversation_message',
  unsafeSql: (sql) => sql + CONVERSATION_THREAD_INDEX_SQL,
  columns: [
    { name: 'user_id', type: 'string', isIndexed: true },
    { name: 'counterpart_id', type: 'string', isIndexed: true },
    { name: 'counterpart_name', type: 'string' },
    { name: 'direction', type: 'string' },
    { name: 'kind', type: 'string' },
    { name: 'body', type: 'string' },
    { name: 'leg', type: 'string', isOptional: true },
    { name: 'state', type: 'string' },
    { name: 'message_key', type: 'string' },
    { name: 'reply_to_key', type: 'string', isOptional: true },
    { name: 'result', type: 'string', isOptional: true },
    { name: 'via', type: 'string', isOptional: true },
    { name: 'is_read', type: 'boolean' },
    { name: 'read_at', type: 'number', isOptional: true },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ],
});

export class ConversationMessageModel extends Model {
  static table = 'conversation_message';

  @field('user_id') userId!: string;
  @field('counterpart_id') counterpartId!: string;
  @text('counterpart_name') counterpartName!: string;
  @field('direction') direction!: ConversationDirection;
  @field('kind') kind!: ConversationKind;
  @field('body') body!: string;
  @field('leg') leg!: ConversationLeg | null;
  @field('state') state!: ConversationState;
  @field('message_key') messageKey!: string;
  @field('reply_to_key') replyToKey!: string | null;
  @json('result', sanitizeResultFrames) result!: ConversationResultFrame[] | null;
  @field('via') via!: ConversationVia | null;
  @field('is_read') isRead!: boolean;
  @date('read_at') readAt!: Date | null;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
