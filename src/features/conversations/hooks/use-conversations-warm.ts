import { useEffect } from 'react';
import type { IConversationSummaryCacheRow } from '@/core/interfaces';
import { viewCacheCoordinatorService } from '@/core/services/view-cache-coordinator.service';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useDeliveryReports } from '@/features/conversations/hooks/use-delivery-reports';
import { bindTyping } from '@/features/conversations/services/typing';
import { prewarmScopesOf } from '@/features/conversations/model/thread-list';

export type ConversationsWarmInput = { preload: () => Promise<void> };

export function useConversationsWarm({ preload }: ConversationsWarmInput): void {
  const summaries = useViewCacheRows<IConversationSummaryCacheRow>(
    VIEW_CACHE_KEYS.conversationList
  );
  const scopes = prewarmScopesOf(summaries.map((summary) => summary.counterpartId)).join(',');
  useDeliveryReports(summaries);

  useEffect(() => {
    bindTyping();
    const timer = setTimeout(() => void preload().catch(() => undefined), 0);
    return () => clearTimeout(timer);
  }, [preload]);

  useEffect(() => {
    viewCacheCoordinatorService.prewarmPages(VIEW_CACHE_KEYS.conversationThread, scopes.split(','));
  }, [scopes]);
}
