import { z } from 'zod';
import {
  WATCH_AUDIENCES,
  WATCH_END_REASONS,
  WATCH_HANDOFFS,
  WATCH_STATES,
  type WatchAudience,
  type WatchConversation,
  type WatchEndReason,
  type WatchHandoff,
  type WatchState,
  type WatchTurn,
} from '@/core/types';

export const WATCH_ROUTES = {
  list: '/rtc/watch',
  end: (conversationId: string) => `/rtc/watch/${encodeURIComponent(conversationId)}/end`,
} as const;

export const WATCH_TOKEN_FIELD = 'watchConversationId' as const;

export const WATCH_HANDOFF_TOPIC = 'argus.handoff' as const;

export const WATCH_TURN_LIMIT = 40;

const seconds = z.number().nonnegative();

const member = <T extends string>(vocabulary: readonly T[], fallback: T) =>
  z
    .string()
    .catch(fallback)
    .transform((value): T => vocabulary.find((entry) => entry === value) ?? fallback);

const turnWire = z.object({
  id: z.union([z.string().min(1), z.number().int()]).transform(String),
  role: z.enum(['user', 'assistant']),
  text: z.string(),
  at: seconds,
  final: z.boolean().catch(true),
});

const conversationWire = z.object({
  conversationId: z.string().min(1),
  cameraId: z.union([z.string().min(1), z.number().int().positive()]).transform(String),
  cameraName: z.string().catch(''),
  state: member<WatchState>(WATCH_STATES, 'listening'),
  handoff: member<WatchHandoff>(WATCH_HANDOFFS, 'camera'),
  audience: member<WatchAudience>(WATCH_AUDIENCES, 'guest'),
  startedAt: seconds,
  updatedAt: seconds,
  resumableUntil: seconds.nullable().catch(null),
  endReason: z
    .string()
    .nullable()
    .catch(null)
    .transform((value): WatchEndReason | null =>
      value === null ? null : (WATCH_END_REASONS.find((entry) => entry === value) ?? 'failed')
    ),
  turns: z.array(z.unknown()).catch([]),
});

const listWire = z.object({ conversations: z.array(z.unknown()) });

function readTurn(raw: unknown): WatchTurn | null {
  const parsed = turnWire.safeParse(raw);
  if (!parsed.success) return null;
  const turn = parsed.data;
  return { id: turn.id, role: turn.role, text: turn.text.trim(), at: turn.at * 1000, final: turn.final };
}

export function readWatchConversation(info: unknown): WatchConversation | null {
  const parsed = conversationWire.safeParse(info);
  if (!parsed.success) return null;
  const wire = parsed.data;
  const turns = wire.turns
    .map(readTurn)
    .filter((turn): turn is WatchTurn => turn !== null && turn.text.length > 0)
    .slice(-WATCH_TURN_LIMIT);
  return {
    conversationId: wire.conversationId,
    cameraId: wire.cameraId,
    cameraName: wire.cameraName,
    state: wire.state,
    handoff: wire.handoff,
    audience: wire.audience,
    startedAt: wire.startedAt * 1000,
    updatedAt: wire.updatedAt * 1000,
    resumableUntil: wire.resumableUntil === null ? null : wire.resumableUntil * 1000,
    endReason: wire.endReason,
    turns,
  };
}

export function readWatchList(info: unknown): WatchConversation[] | null {
  const parsed = listWire.safeParse(info);
  if (!parsed.success) return null;
  return parsed.data.conversations
    .map(readWatchConversation)
    .filter((conversation): conversation is WatchConversation => conversation !== null);
}
