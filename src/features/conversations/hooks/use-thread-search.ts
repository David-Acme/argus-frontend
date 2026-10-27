import { useEffect, useState } from 'react';
import type { IConversationMessageCacheRow } from '@/core/interfaces';
import { conversationService } from '@/core/services/conversation.service';
import { useAuthStore } from '@/core/stores';

export type ThreadSearch = {
  text: string;
  setText: (text: string) => void;
  results: readonly IConversationMessageCacheRow[];
};

const SEARCH_DELAY_MS = 150;

export function useThreadSearch(counterpartId: number, open: boolean): ThreadSearch {
  const userId = useAuthStore((state) => (state.user ? String(state.user.id) : null));
  const [text, setText] = useState('');
  const [results, setResults] = useState<readonly IConversationMessageCacheRow[]>([]);

  useEffect(() => {
    if (!open || userId === null) return;
    let alive = true;
    const timer = setTimeout(() => {
      void conversationService.searchThread(userId, String(counterpartId), text).then((rows) => {
        if (alive) setResults(rows);
      });
    }, SEARCH_DELAY_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [counterpartId, open, text, userId]);

  return { text, setText, results: text.trim().length === 0 ? [] : results };
}
