import type { IConversationMessageCacheRow } from '@/core/interfaces';
import type { ConversationDeliveryState } from '@/core/types';

type MessageFacts = Pick<IConversationMessageCacheRow, 'direction' | 'kind' | 'state'>;

export type DayKind = 'today' | 'yesterday' | 'weekday' | 'date';

export const WEEKDAY_SPAN_DAYS = 6;

const DAY_MS = 24 * 60 * 60 * 1000;

const DELIVERY_STATES: ReadonlySet<string> = new Set<ConversationDeliveryState>([
  'sent',
  'delivered',
  'notified',
  'answered',
  'expired',
]);

const isDeliveryState = (state: string): state is ConversationDeliveryState =>
  DELIVERY_STATES.has(state);

export function deliveryStateOf(message: MessageFacts): ConversationDeliveryState | null {
  if (message.direction !== 'out') return null;
  if (message.kind !== 'relay' && message.kind !== 'reply') return null;
  return isDeliveryState(message.state) ? message.state : null;
}

export function dayKindOf(day: number, today: number, yesterday: number): DayKind {
  if (day === today) return 'today';
  if (day === yesterday) return 'yesterday';
  if (day < today && today - day <= WEEKDAY_SPAN_DAYS * DAY_MS) return 'weekday';
  return 'date';
}

export function replyBodies(
  messages: readonly IConversationMessageCacheRow[]
): ReadonlyMap<string, string> {
  return new Map(
    messages
      .filter((message) => message.messageKey.length > 0)
      .map((message): [string, string] => [message.messageKey, message.body])
  );
}

export function repliedBodyOf(
  message: Pick<IConversationMessageCacheRow, 'kind' | 'replyToKey'>,
  bodies: ReadonlyMap<string, string>
): string | null {
  if (message.kind !== 'reply' || !message.replyToKey) return null;
  return bodies.get(message.replyToKey) ?? null;
}

export function unreadIncomingIds(
  messages: readonly Pick<IConversationMessageCacheRow, 'id' | 'direction' | 'isRead'>[]
): string[] {
  return messages
    .filter((message) => message.direction === 'in' && !message.isRead)
    .map((message) => message.id);
}

export const REPLY_QUOTE_MAX = 60;

export function quoted(body: string, max: number = REPLY_QUOTE_MAX): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

const OPEN_QUESTION =
  /^(qu[eé]|cu[aá]l(es)?|cu[aá]ndo|d[oó]nde|qui[eé]n(es)?|c[oó]mo|cu[aá]nt[oa]s?|por qu[eé]|para qu[eé]|what|which|when|where|who|whom|whose|how|why)(?=[\s,?]|$)/i;

export function asksYesNo(reply: string | null): boolean {
  const said = reply?.trim() ?? '';
  if (!said.endsWith('?')) return false;
  const question = said.includes('¿')
    ? said.slice(said.lastIndexOf('¿') + 1)
    : (said.split(/(?<=[.!])\s+/).at(-1) ?? said);
  return !OPEN_QUESTION.test(question.trim());
}
