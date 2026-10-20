import { useCallback, useEffect, useMemo, useRef } from 'react';
import type {
  IConversationMessageCacheRow,
  IConversationSummaryCacheRow,
  IConversationThreadCache,
} from '@/core/interfaces';
import { conversationService } from '@/core/services/conversation.service';
import { viewCacheCoordinatorService } from '@/core/services/view-cache-coordinator.service';
import { useAuthStore } from '@/core/stores';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows, useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { counterpartNameOf, isArgus } from '@/features/conversations/model/conversation-labels';
import {
  conversationClearIntents,
  conversationLenses,
  conversationReadIntents,
  typedMessageIntent,
} from '@/features/conversations/model/conversation-optimistic';
import { unreadIncomingIds } from '@/features/conversations/model/conversation-thread';

export type ConversationThread = {
  messages: readonly IConversationMessageCacheRow[];
  loaded: boolean;
  hasOlder: boolean;
  newest: IConversationMessageCacheRow | null;
  live: boolean;
  name: string;
  argus: boolean;
  clear: () => Promise<boolean>;
  send: (body: string) => Promise<boolean>;
  loadOlder: () => Promise<boolean>;
  loadNewer: () => Promise<boolean>;
  toLatest: () => void;
};

const READ_ALL = '*';

const NO_ROWS: readonly IConversationMessageCacheRow[] = [];

const THREAD_KEY = VIEW_CACHE_KEYS.conversationThread;

export function useConversationThread(counterpartId: number): ConversationThread {
  const { t } = useTranslation();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const scope = String(counterpartId);
  const page = useViewCacheValue<IConversationThreadCache>(THREAD_KEY, scope);
  const synced = page?.rows ?? NO_ROWS;
  const live = page?.live ?? true;
  const summaries = useViewCacheRows<IConversationSummaryCacheRow>(VIEW_CACHE_KEYS.conversationList);
  const lenses = useMemo(() => conversationLenses(counterpartId), [counterpartId]);
  const { rows: messages } = useOptimisticRows(synced, lenses);
  const summary = summaries.find((row) => row.counterpartId === counterpartId);
  const name = counterpartNameOf(counterpartId, summary?.counterpartName ?? '', t);
  const argus = isArgus(counterpartId);
  const requested = useRef<ReadonlySet<string>>(new Set());
  const unread = useMemo(() => unreadIncomingIds(messages), [messages]);
  const unreadKey = unread.join(',');
  const unreadElsewhere = (summary?.unread ?? 0) > unread.length;

  const loadOlder = useCallback(() => viewCacheCoordinatorService.extendPages(THREAD_KEY, scope, 'older'), [scope]);

  const loadNewer = useCallback(() => viewCacheCoordinatorService.extendPages(THREAD_KEY, scope, 'newer'), [scope]);

  const toLatest = useCallback(() => viewCacheCoordinatorService.resetPages(THREAD_KEY, scope), [scope]);

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

  const send = useCallback(
    async (body: string): Promise<boolean> => {
      if (!live) toLatest();
      const result = await runOptimistic({
        intents: [typedMessageIntent({ counterpartId, counterpartName: name, body, createdAt: Date.now() })],
        call: () => conversationService.send(counterpartId, body),
        errorTitle: t('screens.conversations.composer.send-failed', { name }),
      });
      return result !== null;
    },
    [counterpartId, live, name, t, toLatest]
  );

  useEffect(() => {
    viewCacheCoordinatorService.watchPages(THREAD_KEY, scope);
    return () => viewCacheCoordinatorService.releasePages(THREAD_KEY, scope);
  }, [scope]);

  useEffect(() => {
    const fresh = unreadKey.split(',').filter((id) => id.length > 0 && !requested.current.has(id));
    const elsewhere = unreadElsewhere && !requested.current.has(READ_ALL);
    if (fresh.length === 0 && !elsewhere) return;
    requested.current = new Set([...requested.current, ...fresh, ...(elsewhere ? [READ_ALL] : [])]);
    void runOptimistic({
      intents: conversationReadIntents(fresh),
      call: () => conversationService.markRead(counterpartId),
      errorTitle: t('screens.conversations.read-failed'),
    });
  }, [counterpartId, t, unreadElsewhere, unreadKey]);

  return {
    messages,
    loaded: page !== null,
    hasOlder: page?.hasOlder ?? false,
    newest: summary?.last ?? null,
    live,
    name,
    argus,
    clear,
    send,
    loadOlder,
    loadNewer,
    toLatest,
  };
}
