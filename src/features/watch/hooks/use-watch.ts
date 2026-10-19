import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '@/core/stores';
import type { WatchConversation } from '@/core/types';
import { CAPABILITY, MODULE_IDS, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { isWatchLive, latestConversation, liveConversation } from '@/features/watch/model/watch-conversation';
import { bindWatchFeed, pruneWatch, refreshWatch } from '@/features/watch/services/watch-feed';

const EMPTY: readonly WatchConversation[] = [];

const CLOCK_MS = 1000;

export function useWatchEnabled(): boolean {
  const { has, moduleActive } = useCapabilities();
  return has(CAPABILITY.assistantVoice) && moduleActive(MODULE_IDS.surveillance);
}

export function useWatchConversations(): readonly WatchConversation[] {
  const enabled = useWatchEnabled();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const stored = useViewCacheValue<WatchConversation[]>(VIEW_CACHE_KEYS.watchConversations);

  useEffect(() => {
    if (!enabled || userId === null) return;
    bindWatchFeed();
    void refreshWatch();
  }, [enabled, userId]);

  useEffect(() => {
    if (!enabled) return undefined;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshWatch();
    });
    return () => subscription.remove();
  }, [enabled]);

  return enabled ? (stored ?? EMPTY) : EMPTY;
}

function useWatchClock(running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), CLOCK_MS);
    return () => clearInterval(timer);
  }, [running]);
  return now;
}

export type WatchView = {
  live: WatchConversation | null;
  latest: WatchConversation | null;
  now: number;
};

export function useWatch(): WatchView {
  const conversations = useWatchConversations();
  const anyLive = useMemo(() => conversations.some((entry) => entry.state !== 'ended'), [conversations]);
  const now = useWatchClock(anyLive);
  const live = useMemo(() => liveConversation(conversations, now), [conversations, now]);
  const latest = useMemo(() => latestConversation(conversations, now), [conversations, now]);

  useEffect(() => {
    if (!anyLive || live !== null) return;
    pruneWatch(now);
  }, [anyLive, live, now]);

  return { live: live && isWatchLive(live, now) ? live : null, latest, now };
}
