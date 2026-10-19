import type { IConversationSummaryCacheRow } from '@/core/interfaces';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows, useViewCacheValue } from '@/shared/hooks/use-cached-rows';

export function useConversations(): readonly IConversationSummaryCacheRow[] {
  return useViewCacheRows<IConversationSummaryCacheRow>(VIEW_CACHE_KEYS.conversationList);
}

export function useConversationUnread(): number {
  return useViewCacheValue<number>(VIEW_CACHE_KEYS.conversationUnread) ?? 0;
}
