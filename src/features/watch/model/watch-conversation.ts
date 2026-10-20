import type { IconName, TranslationKey, WatchConversation, WatchState, WatchTurn } from '@/core/types';

export const WATCH_KEEP_ENDED_MS = 10 * 60_000;

export const WATCH_KEEP_LIMIT = 5;

export const WATCH_TRANSCRIPT_LIMIT = 40;

export function mergeTurns(held: readonly WatchTurn[], incoming: readonly WatchTurn[]): WatchTurn[] {
  const byId = new Map<string, WatchTurn>();
  for (const turn of held) byId.set(turn.id, turn);
  for (const turn of incoming) byId.set(turn.id, turn);
  return [...byId.values()]
    .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id))
    .slice(-WATCH_TRANSCRIPT_LIMIT);
}

export function isWatchLive(conversation: WatchConversation, now: number): boolean {
  if (conversation.state === 'ended') return false;
  if (conversation.state !== 'resumable') return true;
  return conversation.resumableUntil === null || conversation.resumableUntil > now;
}

function settled(conversation: WatchConversation, now: number): WatchConversation {
  if (conversation.state !== 'resumable' || isWatchLive(conversation, now)) return conversation;
  return { ...conversation, state: 'ended', endReason: conversation.endReason ?? 'camera_lost' };
}

function byRecency(a: WatchConversation, b: WatchConversation): number {
  return b.updatedAt - a.updatedAt || b.conversationId.localeCompare(a.conversationId);
}

export function pruneConversations(list: readonly WatchConversation[], now: number): WatchConversation[] {
  return list
    .map((conversation) => settled(conversation, now))
    .filter((conversation) => isWatchLive(conversation, now) || conversation.updatedAt >= now - WATCH_KEEP_ENDED_MS)
    .sort(byRecency)
    .slice(0, WATCH_KEEP_LIMIT);
}

export function mergeConversation(
  list: readonly WatchConversation[],
  incoming: WatchConversation,
  now: number
): WatchConversation[] {
  const held = list.find((conversation) => conversation.conversationId === incoming.conversationId);
  const others = list.filter((conversation) => conversation.conversationId !== incoming.conversationId);
  if (held && held.updatedAt > incoming.updatedAt) {
    return pruneConversations([...others, { ...held, turns: mergeTurns(incoming.turns, held.turns) }], now);
  }
  const merged = held ? { ...incoming, turns: mergeTurns(held.turns, incoming.turns) } : incoming;
  return pruneConversations([...others, merged], now);
}

export function replaceConversations(
  list: readonly WatchConversation[],
  fresh: readonly WatchConversation[],
  now: number
): WatchConversation[] {
  const listed = new Set(fresh.map((conversation) => conversation.conversationId));
  const gone = list
    .filter((conversation) => !listed.has(conversation.conversationId))
    .map((conversation) =>
      conversation.state === 'ended'
        ? conversation
        : { ...conversation, state: 'ended' as const, endReason: conversation.endReason ?? 'camera_lost' }
    );
  return fresh.reduce<WatchConversation[]>(
    (merged, conversation) => mergeConversation(merged, conversation, now),
    pruneConversations(gone, now)
  );
}

export function liveConversation(list: readonly WatchConversation[], now: number): WatchConversation | null {
  return [...list].sort(byRecency).find((conversation) => isWatchLive(conversation, now)) ?? null;
}

export function latestConversation(list: readonly WatchConversation[], now: number): WatchConversation | null {
  return liveConversation(list, now) ?? [...list].sort(byRecency)[0] ?? null;
}

export function canContinueHere(conversation: WatchConversation | null, now: number, callActive: boolean): boolean {
  if (!conversation || callActive || !isWatchLive(conversation, now)) return false;
  if (conversation.audience !== 'member' && conversation.audience !== 'discreet') return false;
  return conversation.handoff === 'camera' || conversation.handoff === 'offering';
}

export function canEndConversation(conversation: WatchConversation | null, now: number): boolean {
  return conversation !== null && isWatchLive(conversation, now) && conversation.handoff !== 'device';
}

export function newlyWoken(previous: WatchConversation | undefined, next: WatchConversation): boolean {
  if (next.state !== 'waking' && next.state !== 'listening') return false;
  return previous === undefined || previous.state === 'ended';
}

export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
}

export function resumableSecondsLeft(conversation: WatchConversation, now: number): number | null {
  if (conversation.state !== 'resumable' || conversation.resumableUntil === null) return null;
  return Math.max(0, Math.ceil((conversation.resumableUntil - now) / 1000));
}

export type WatchIndicator = {
  label: TranslationKey;
  icon: IconName;
  dot: string;
};

export const WATCH_INDICATORS = {
  waking: {
    label: 'screens.watch.state.waking',
    icon: 'ear',
    dot: 'bg-accent',
  },
  listening: {
    label: 'screens.watch.state.listening',
    icon: 'ear',
    dot: 'bg-success',
  },
  thinking: {
    label: 'screens.watch.state.thinking',
    icon: 'loader-circle',
    dot: 'bg-interactive',
  },
  speaking: {
    label: 'screens.watch.state.speaking',
    icon: 'audio-lines',
    dot: 'bg-success',
  },
  resumable: {
    label: 'screens.watch.state.resumable',
    icon: 'pause',
    dot: 'bg-warning',
  },
  ended: {
    label: 'screens.watch.state.ended',
    icon: 'check',
    dot: 'bg-muted-foreground',
  },
} as const satisfies Record<WatchState, WatchIndicator>;

export const WATCH_HANDOFF_LABEL = {
  camera: null,
  offering: 'screens.watch.handoff.offering',
  bridging: 'screens.watch.handoff.bridging',
  device: 'screens.watch.handoff.device',
} as const satisfies Record<WatchConversation['handoff'], TranslationKey | null>;

export const WATCH_AUDIENCE_NOTE = {
  member: null,
  discreet: 'screens.watch.audience.discreet',
  guest: 'screens.watch.audience.guest',
  visitor: 'screens.watch.audience.visitor',
} as const satisfies Record<WatchConversation['audience'], TranslationKey | null>;

export const WATCH_END_LABEL = {
  silence: 'screens.watch.end.silence',
  goodbye: 'screens.watch.end.goodbye',
  limit: 'screens.watch.end.limit',
  camera_lost: 'screens.watch.end.camera-lost',
  busy: 'screens.watch.end.busy',
  handed_off: 'screens.watch.end.handed-off',
  watchman_off: 'screens.watch.end.watchman-off',
  ended_by_user: 'screens.watch.end.ended-by-user',
  failed: 'screens.watch.end.failed',
} as const satisfies Record<NonNullable<WatchConversation['endReason']>, TranslationKey>;
