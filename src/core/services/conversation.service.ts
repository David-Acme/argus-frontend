import { Q } from '@nozbe/watermelondb';
import type { Clause } from '@nozbe/watermelondb/QueryDescription';
import { auditTime, combineLatest, from, map, of, startWith, switchMap, type Observable } from 'rxjs';
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
import {
  CONVERSATION_PATH,
  conversationMessagePath,
  conversationReadPath,
  conversationThreadPath,
  INITIAL_THREAD_WINDOW,
  isHeadWindow,
  isLiveWindow,
  newerThreadWindow,
  olderThanWindow,
  olderThreadWindow,
  THREAD_PAGE,
  threadWindowClauses,
  type ThreadFetch,
  type ThreadWindow,
} from './conversation';
import { DatabaseService } from './database.service';
import type { ConversationSummaryFacts, ConversationThreadInput } from './view-cache/conversation.projection';

const THREAD_COLUMNS = ['counterpart_name', 'body', 'state', 'is_read', 'read_at', 'updated_at'];

const SUMMARY_REFRESH_MS = 120;

const MAX_COUNTERPARTS = 200;


const NEWEST_FIRST: Clause[] = [Q.sortBy('created_at', Q.desc), Q.sortBy('id', Q.desc)];

const OLDEST_FIRST: Clause[] = [Q.sortBy('created_at', Q.asc), Q.sortBy('id', Q.asc)];

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

  observeSummaryFacts(userId: string): Observable<ConversationSummaryFacts[]> {
    return this.collection.changes.pipe(
      startWith(null),
      auditTime(SUMMARY_REFRESH_MS),
      switchMap(() => from(this.summaryFacts(userId)))
    );
  }

  observeThreadWindow(userId: string, counterpartId: string, window: ThreadWindow): Observable<ConversationThreadInput> {
    const thread = this.threadClauses(userId, counterpartId);
    const live = isLiveWindow(window);
    if (isHeadWindow(window)) {
      return this.observeManyWithColumns(THREAD_COLUMNS, [...thread, ...NEWEST_FIRST, Q.take(THREAD_PAGE + 1)]).pipe(
        map((rows) => ({ rows: rows.slice(0, THREAD_PAGE), older: rows.length > THREAD_PAGE, live }))
      );
    }
    const olderClause = olderThanWindow(window);
    return combineLatest([
      this.observeManyWithColumns(THREAD_COLUMNS, [...thread, ...threadWindowClauses(window), ...NEWEST_FIRST]),
      olderClause ? this.observeMany([...thread, olderClause, ...NEWEST_FIRST, Q.take(1)]) : of([]),
    ]).pipe(map(([rows, beyond]) => ({ rows, older: beyond.length > 0, live })));
  }

  olderThread(userId: string, counterpartId: string, window: ThreadWindow): Promise<ThreadWindow> {
    return olderThreadWindow(window, this.threadFetch(userId, counterpartId));
  }

  newerThread(userId: string, counterpartId: string, window: ThreadWindow): Promise<ThreadWindow> {
    return newerThreadWindow(window, this.threadFetch(userId, counterpartId));
  }

  initialThread(): ThreadWindow {
    return INITIAL_THREAD_WINDOW;
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

  private threadClauses(userId: string, counterpartId: string): Clause[] {
    return [Q.where('user_id', userId), Q.where('counterpart_id', counterpartId)];
  }

  private threadFetch(userId: string, counterpartId: string): ThreadFetch {
    const thread = this.threadClauses(userId, counterpartId);
    return ({ where, order, take }) =>
      this.fetchMany([...thread, ...where, ...(order === 'desc' ? NEWEST_FIRST : OLDEST_FIRST), Q.take(take)]);
  }

  private async newest(clauses: Clause[]): Promise<ConversationMessageModel | null> {
    const [row] = await this.fetchMany([...clauses, ...NEWEST_FIRST, Q.take(1)]);
    return row ?? null;
  }

  private async summaryFacts(userId: string): Promise<ConversationSummaryFacts[]> {
    const mine = Q.where('user_id', userId);
    const seen: string[] = [];
    const facts: ConversationSummaryFacts[] = [];
    while (seen.length < MAX_COUNTERPARTS) {
      const last = await this.newest([mine, ...(seen.length > 0 ? [Q.where('counterpart_id', Q.notIn([...seen]))] : [])]);
      if (!last) break;
      const counterpartId = last.counterpartId;
      seen.push(counterpartId);
      const thread = [mine, Q.where('counterpart_id', counterpartId)];
      const [lastSent, lastNamed, unread] = await Promise.all([
        this.newest([...thread, Q.where('direction', 'out'), Q.where('kind', Q.oneOf(['relay', 'reply']))]),
        this.newest([...thread, Q.where('counterpart_name', Q.notEq(''))]),
        this.fetchTotal([...thread, Q.where('direction', 'in'), Q.where('is_read', false)]),
      ]);
      facts.push({ counterpartId, last, lastSent, lastNamed, unread });
    }
    return facts;
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
