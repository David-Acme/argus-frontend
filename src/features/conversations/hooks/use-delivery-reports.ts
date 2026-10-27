import { useEffect, useRef } from 'react';
import type { IConversationSummaryCacheRow } from '@/core/interfaces';
import { conversationService } from '@/core/services/conversation.service';
import { deliveryReportsOf } from '@/features/conversations/model/receipts';

export function useDeliveryReports(summaries: readonly IConversationSummaryCacheRow[]): void {
  const reported = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    for (const { counterpartId, upToId } of deliveryReportsOf(summaries, reported.current)) {
      reported.current.set(counterpartId, upToId);
      void conversationService.markDelivered(counterpartId, upToId);
    }
  }, [summaries]);
}
