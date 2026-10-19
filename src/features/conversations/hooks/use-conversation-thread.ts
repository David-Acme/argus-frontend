import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { IConversationMessageCacheRow, IConversationSummaryCacheRow } from '@/core/interfaces';
import { conversationService } from '@/core/services/conversation.service';
import { useAuthStore } from '@/core/stores';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { counterpartNameOf, isArgus } from '@/features/conversations/model/conversation-labels';
import {
  CONVERSATION_MESSAGE_LENSES,
  conversationClearIntents,
  conversationReadIntents,
} from '@/features/conversations/model/conversation-optimistic';
import { unreadIncomingIds } from '@/features/conversations/model/conversation-thread';

export type ConversationThread = {
  messages: readonly IConversationMessageCacheRow[];
  name: string;
  argus: boolean;
  clear: () => Promise<boolean>;
};

export function useConversationThread(counterpartId: number): ConversationThread {
  const { t } = useTranslation();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const synced = useViewCacheRows<IConversationMessageCacheRow>(VIEW_CACHE_KEYS.conversationThread, String(counterpartId));
  const summaries = useViewCacheRows<IConversationSummaryCacheRow>(VIEW_CACHE_KEYS.conversationList);
  const { rows: messages } = useOptimisticRows(synced, CONVERSATION_MESSAGE_LENSES);
  const summary = summaries.find((row) => row.counterpartId === counterpartId);
  const name = counterpartNameOf(counterpartId, summary?.counterpartName ?? '', t);
  const argus = isArgus(counterpartId);
  const requested = useRef<ReadonlySet<string>>(new Set());
  const unread = useMemo(() => unreadIncomingIds(messages), [messages]);
  const unreadKey = unread.join(',');

  const clear = useCallback(async (): Promise<boolean> => {
    if (userId === null) return false;
    const result = await runOptimistic({
      intents: conversationClearIntents(synced),
      confirm: {
        title: t('screens.conversations.clear-title', { name }),
        description: argus
          ? t('screens.conversations.clear-description-argus')
          : t('screens.conversations.clear-description', { name }),
        confirmLabel: t('screens.conversations.clear-confirm'),
        intent: 'danger',
      },
      call: () => conversationService.clearThread(String(userId), counterpartId),
      errorTitle: t('screens.conversations.clear-failed'),
    });
    return result !== null;
  }, [argus, counterpartId, name, synced, t, userId]);

  useEffect(() => {
    const fresh = unreadKey.split(',').filter((id) => id.length > 0 && !requested.current.has(id));
    if (fresh.length === 0) return;
    requested.current = new Set([...requested.current, ...fresh]);
    void runOptimistic({
      intents: conversationReadIntents(fresh),
      call: () => conversationService.markRead(counterpartId),
      errorTitle: t('screens.conversations.read-failed'),
    });
  }, [counterpartId, t, unreadKey]);

  return { messages, name, argus, clear };
}
