import { readWatchConversation } from '@/core/contracts/watch.contract';
import { log } from '@/core/services/log';
import { synchronizeService } from '@/core/services/sync';
import { viewCacheService } from '@/core/services/view-cache.service';
import type { WatchConversation } from '@/core/types';
import { SYNC_OPERATION, VIEW_CACHE_KEYS } from '@/shared/constants';
import { completeWatchHandoff } from '@/features/voice';
import {
  mergeConversation,
  newlyWoken,
  pruneConversations,
  replaceConversations,
} from '@/features/watch/model/watch-conversation';
import { watchService } from '@/features/watch/services/watch.service';

type WokenListener = (conversation: WatchConversation) => void;

const wokenListeners = new Set<WokenListener>();

let bound = false;
let refreshing: Promise<void> | null = null;

export function watchConversations(): WatchConversation[] {
  return viewCacheService.readValue<WatchConversation[]>(VIEW_CACHE_KEYS.watchConversations) ?? [];
}

function store(next: WatchConversation[]): void {
  viewCacheService.writeValue(VIEW_CACHE_KEYS.watchConversations, next);
}

export function applyWatchFrame(conversation: WatchConversation, now = Date.now()): void {
  const held = watchConversations();
  const previous = held.find((entry) => entry.conversationId === conversation.conversationId);
  store(mergeConversation(held, conversation, now));
  if (conversation.handoff === 'device') completeWatchHandoff(conversation.conversationId);
  if (newlyWoken(previous, conversation)) wokenListeners.forEach((listener) => listener(conversation));
}

export function pruneWatch(now = Date.now()): void {
  store(pruneConversations(watchConversations(), now));
}

export function refreshWatch(): Promise<void> {
  if (refreshing) return refreshing;
  refreshing = watchService
    .list()
    .then((result) => {
      if (result.ok && result.info) store(replaceConversations(watchConversations(), result.info, Date.now()));
    })
    .catch((reason: unknown) => log.error('watch', 'the camera conversations could not be read', reason))
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export function onWatchWoken(listener: WokenListener): () => void {
  wokenListeners.add(listener);
  return () => wokenListeners.delete(listener);
}

export function bindWatchFeed(): void {
  if (bound) return;
  bound = true;
  synchronizeService.on(SYNC_OPERATION.WatchUpdate, (message) => {
    const conversation = readWatchConversation(message.info);
    if (conversation) applyWatchFrame(conversation);
  });
  synchronizeService.onConnect(() => {
    void refreshWatch();
  });
}
