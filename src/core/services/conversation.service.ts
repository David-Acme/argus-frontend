import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { z } from 'zod';
import {
  conversationListSchema,
  conversationMessageSchema,
  conversationReadResultSchema,
} from '@/core/contracts/conversation.contract';
import type { ConversationMessageModel } from '@/core/database';
import type { IServiceResponse } from '@/core/interfaces';
import type { ConversationMessage, ConversationReadResult, ConversationSummary } from '@/core/types';
import { httpService } from '@/core/services/http';
import { errorResponse } from '@/core/services/http/http-envelope';
import { CONVERSATION_PATH, conversationMessagePath, conversationReadPath, conversationThreadPath } from './conversation';
import { DatabaseService } from './database.service';

const THREAD_COLUMNS = ['counterpart_name', 'body', 'state', 'is_read', 'read_at', 'updated_at'];

function parsed<T>(response: IServiceResponse<unknown>, schema: z.ZodType<T>): IServiceResponse<T> {
  if (!response.ok) return { ...response, info: null };
  const result = schema.safeParse(response.info);
  if (!result.success) {
    return errorResponse(response.status, 'INVALID_RESPONSE', 'The conversation answer is not in the expected shape');
  }
  return { ...response, info: result.data };
}

class ConversationService extends DatabaseService<'conversation_message'> {
  constructor() {
    super('conversation_message');
  }

  observeForUser(userId: string): Observable<ConversationMessageModel[]> {
    return this.observeManyWithColumns(THREAD_COLUMNS, [Q.where('user_id', userId)]);
  }

  async list(): Promise<IServiceResponse<ConversationSummary[]>> {
    return parsed(await httpService.get<unknown>(CONVERSATION_PATH), conversationListSchema);
  }

  async markRead(counterpartId: number): Promise<IServiceResponse<ConversationReadResult>> {
    return parsed(await httpService.patch<unknown>(conversationReadPath(counterpartId), {}), conversationReadResultSchema);
  }

  async send(counterpartId: number, body: string): Promise<IServiceResponse<ConversationMessage>> {
    return parsed(await httpService.post<unknown>(conversationMessagePath(counterpartId), { body }), conversationMessageSchema);
  }

  async clearThread(userId: string, counterpartId: number): Promise<IServiceResponse<null>> {
    const response = await httpService.delete<unknown>(conversationThreadPath(counterpartId));
    if (!response.ok) return { ...response, info: null };
    await this.forgetThread(userId, counterpartId);
    return { ...response, info: null };
  }

  private async forgetThread(userId: string, counterpartId: number): Promise<void> {
    const rows = await this.fetchMany([
      Q.where('user_id', userId),
      Q.where('counterpart_id', String(counterpartId)),
    ]);
    if (rows.length === 0) return;
    await this.write(() => this.collection.database.batch(rows.map((row) => row.prepareDestroyPermanently())));
  }
}

export const conversationService = new ConversationService();
