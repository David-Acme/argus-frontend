import type { IConversationMessageCacheRow, IConversationSummaryCacheRow } from '@/core/interfaces';
import type { AssistantChatEntryStatus, ConversationReceipt } from '@/core/types';
import { isPendingRecordId } from '@/shared/libs/optimistic';

export type BubbleStatus = 'sending' | ConversationReceipt | 'failed';

export type ChatStatusInput = { status: AssistantChatEntryStatus; typed: boolean };

export type DeliveryReport = { counterpartId: number; upToId: number };

type ReceiptFacts = Pick<
  IConversationMessageCacheRow,
  'id' | 'direction' | 'kind' | 'state' | 'receipt'
>;

const RELAYED_TO_DELIVERED: ReadonlySet<string> = new Set(['delivered', 'notified', 'answered']);

export function rowStatusOf(row: ReceiptFacts): BubbleStatus | null {
  if (row.direction !== 'out' || row.kind === 'visitor') return null;
  if (isPendingRecordId(row.id)) return 'sending';
  if (row.receipt) return row.receipt;
  if (row.kind === 'turn') return 'read';
  return RELAYED_TO_DELIVERED.has(row.state) ? 'delivered' : 'sent';
}

export function chatStatusOf({ status, typed }: ChatStatusInput): BubbleStatus {
  if (status === 'failed') return 'failed';
  if (status === 'done') return 'read';
  if (status === 'waiting' && typed) return 'delivered';
  return 'sending';
}

export const serverIdOf = (id: string): number | null => {
  const value = Number(id);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
};

export function newestIncomingServerId(
  rows: readonly Pick<IConversationMessageCacheRow, 'id' | 'direction'>[]
): number | null {
  let newest: number | null = null;
  for (const row of rows) {
    if (row.direction !== 'in') continue;
    const id = serverIdOf(row.id);
    if (id !== null && (newest === null || id > newest)) newest = id;
  }
  return newest;
}

export function deliveryReportsOf(
  summaries: readonly Pick<IConversationSummaryCacheRow, 'counterpartId' | 'last'>[],
  reported: ReadonlyMap<number, number>
): DeliveryReport[] {
  const reports: DeliveryReport[] = [];
  for (const { counterpartId, last } of summaries) {
    if (counterpartId <= 0 || last.direction !== 'in') continue;
    const upToId = serverIdOf(last.id);
    if (upToId === null || upToId <= (reported.get(counterpartId) ?? 0)) continue;
    reports.push({ counterpartId, upToId });
  }
  return reports;
}
