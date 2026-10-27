import { useCallback, useEffect, useMemo } from 'react';
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
import type { MenuConfirm } from '@/shared/ui/menu';
import { counterpartNameOf, isArgus } from '@/features/conversations/model/conversation-labels';
import { useReadReports } from '@/features/conversations/hooks/use-read-reports';
import { useThreadSend } from '@/features/conversations/hooks/use-thread-send';
import type { ThreadSend } from '@/features/conversations/hooks/use-thread-send';
import {
  conversationClearIntents,
  conversationLenses,
} from '@/features/conversations/model/conversation-optimistic';

export type ConversationThread = {
  counterpartId: number;
  messages: readonly IConversationMessageCacheRow[];
  loaded: boolean;
  hasOlder: boolean;
  newest: IConversationMessageCacheRow | null;
  live: boolean;
  name: string;
  argus: boolean;
  clear: () => Promise<boolean>;
  clearWords: MenuConfirm;
  outbox: ThreadSend;
  loadOlder: () => Promise<boolean>;
  loadNewer: () => Promise<boolean>;
  toLatest: () => void;
};

const NO_ROWS: readonly IConversationMessageCacheRow[] = [];

const THREAD_KEY = VIEW_CACHE_KEYS.conversationThread;

export function useConversationThread(counterpartId: number): ConversationThread {
  const { t } = useTranslation();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const scope = String(counterpartId);
  const page = useViewCacheValue<IConversationThreadCache>(THREAD_KEY, scope);
  const synced = page?.rows ?? NO_ROWS;
  const live = page?.live ?? true;
  const summaries = useViewCacheRows<IConversationSummaryCacheRow>(
    VIEW_CACHE_KEYS.conversationList
  );
  const lenses = useMemo(() => conversationLenses(counterpartId), [counterpartId]);
  const { rows: messages } = useOptimisticRows(synced, lenses);
  const summary = summaries.find((row) => row.counterpartId === counterpartId);
  const name = counterpartNameOf(counterpartId, summary?.counterpartName ?? '', t);
  const argus = isArgus(counterpartId);
  useReadReports({ counterpartId, messages, unreadInSummary: summary?.unread ?? 0 });

  const loadOlder = useCallback(
    () => viewCacheCoordinatorService.extendPages(THREAD_KEY, scope, 'older'),
    [scope]
  );

  const loadNewer = useCallback(
    () => viewCacheCoordinatorService.extendPages(THREAD_KEY, scope, 'newer'),
    [scope]
  );

  const toLatest = useCallback(
    () => viewCacheCoordinatorService.resetPages(THREAD_KEY, scope),
    [scope]
  );

  const clear = useCallback(async (): Promise<boolean> => {
    if (userId === null) return false;
    const result = await runOptimistic({
      intents: conversationClearIntents(synced),
      call: () => conversationService.clearThread(String(userId), counterpartId),
      errorTitle: t('screens.conversations.clear-failed'),
    });
    return result !== null;
  }, [counterpartId, synced, t, userId]);

  const clearWords: MenuConfirm = {
    title: t('screens.conversations.clear-title', { name }),
    body: argus
      ? t('screens.conversations.clear-description-argus')
      : t('screens.conversations.clear-description', { name }),
    confirmLabel: t('screens.conversations.clear-confirm'),
  };

  const outbox = useThreadSend({
    counterpartId,
    name,
    beforeSend: () => {
      if (!live) toLatest();
    },
  });

  useEffect(() => {
    viewCacheCoordinatorService.watchPages(THREAD_KEY, scope);
    return () => viewCacheCoordinatorService.releasePages(THREAD_KEY, scope);
  }, [scope]);

  return {
    counterpartId,
    messages,
    loaded: page !== null,
    hasOlder: page?.hasOlder ?? false,
    newest: summary?.last ?? null,
    live,
    name,
    argus,
    clear,
    clearWords,
    outbox,
    loadOlder,
    loadNewer,
    toLatest,
  };
}
