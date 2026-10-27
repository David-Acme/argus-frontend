import { useIsFocused } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import type { IConversationMessageCacheRow } from '@/core/interfaces';
import { conversationService } from '@/core/services/conversation.service';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { conversationReadIntents } from '@/features/conversations/model/conversation-optimistic';
import { unreadIncomingIds } from '@/features/conversations/model/conversation-thread';
import { newestIncomingServerId } from '@/features/conversations/model/receipts';

export type ReadReportsInput = {
  counterpartId: number;
  messages: readonly IConversationMessageCacheRow[];
  unreadInSummary: number;
};

const READ_ALL = '*';

export function useReadReports({
  counterpartId,
  messages,
  unreadInSummary,
}: ReadReportsInput): void {
  const { t } = useTranslation();
  const focused = useIsFocused();
  const requested = useRef<ReadonlySet<string>>(new Set());
  const unread = useMemo(() => unreadIncomingIds(messages), [messages]);
  const unreadKey = unread.join(',');
  const unreadElsewhere = unreadInSummary > unread.length;

  useEffect(() => {
    if (!focused) return;
    const fresh = unreadKey.split(',').filter((id) => id.length > 0 && !requested.current.has(id));
    const elsewhere = unreadElsewhere && !requested.current.has(READ_ALL);
    if (fresh.length === 0 && !elsewhere) return;
    requested.current = new Set([...requested.current, ...fresh, ...(elsewhere ? [READ_ALL] : [])]);
    const upToId = elsewhere
      ? null
      : newestIncomingServerId(fresh.map((id) => ({ id, direction: 'in' as const })));
    void runOptimistic({
      intents: conversationReadIntents(fresh),
      call: () => conversationService.markRead(counterpartId, upToId),
      errorTitle: t('screens.conversations.read-failed'),
    });
  }, [counterpartId, focused, t, unreadElsewhere, unreadKey]);
}
