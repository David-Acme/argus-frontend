export const WATCH_STATES = ['waking', 'listening', 'thinking', 'speaking', 'resumable', 'ended'] as const;

export type WatchState = (typeof WATCH_STATES)[number];

export const WATCH_HANDOFFS = ['camera', 'offering', 'bridging', 'device'] as const;

export type WatchHandoff = (typeof WATCH_HANDOFFS)[number];

export const WATCH_AUDIENCES = ['member', 'discreet', 'guest', 'visitor'] as const;

export type WatchAudience = (typeof WATCH_AUDIENCES)[number];

export const WATCH_END_REASONS = [
  'silence',
  'goodbye',
  'limit',
  'camera_lost',
  'busy',
  'handed_off',
  'watchman_off',
  'ended_by_user',
  'failed',
] as const;

export type WatchEndReason = (typeof WATCH_END_REASONS)[number];

export type WatchTurnRole = 'user' | 'assistant';

export type WatchTurn = {
  id: string;
  role: WatchTurnRole;
  text: string;
  at: number;
  final: boolean;
};

export type WatchConversation = {
  conversationId: string;
  cameraId: string;
  cameraName: string;
  state: WatchState;
  handoff: WatchHandoff;
  audience: WatchAudience;
  startedAt: number;
  updatedAt: number;
  resumableUntil: number | null;
  endReason: WatchEndReason | null;
  turns: WatchTurn[];
};
