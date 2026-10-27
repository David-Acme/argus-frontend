import type { IConversationMessageCacheRow } from '@/core/interfaces';
import type { AssistantChatEntry, ConversationLeg } from '@/core/types';

export type ChatMark = {
  clientId: string;
  status: 'sending' | 'failed';
  error: string | null;
};

export type ChatOverlay = {
  rows: readonly IConversationMessageCacheRow[];
  marks: ReadonlyMap<string, ChatMark>;
  typing: boolean;
};

export type ChatOverlayInput = {
  messages: readonly IConversationMessageCacheRow[];
  entries: readonly AssistantChatEntry[];
  leg: ConversationLeg;
  skewMs: number;
};

const normalized = (text: string): string => text.replace(/\s+/g, ' ').trim();

const chatRow = (
  id: string,
  facts: Pick<IConversationMessageCacheRow, 'direction' | 'body' | 'leg' | 'createdAt'>
): IConversationMessageCacheRow => ({
  id,
  counterpartId: 0,
  counterpartName: '',
  kind: 'turn',
  state: 'delivered',
  messageKey: '',
  replyToKey: null,
  result: null,
  via: null,
  isRead: true,
  ...facts,
});

export const chatRowId = (clientId: string): string => `chat:${clientId}`;

export const chatReplyRowId = (clientId: string): string => `chat:${clientId}:reply`;

export function chatOverlay({ messages, entries, leg, skewMs }: ChatOverlayInput): ChatOverlay {
  if (entries.length === 0) return { rows: messages, marks: new Map(), typing: false };
  const used = new Set<string>();
  const added: IConversationMessageCacheRow[] = [];
  const marks = new Map<string, ChatMark>();
  let typing = false;

  const synced = (match: (message: IConversationMessageCacheRow) => boolean) =>
    messages.find((message) => !used.has(message.id) && message.kind === 'turn' && match(message));

  for (const entry of entries) {
    const since = entry.sentAt - skewMs;
    const text = normalized(entry.text);
    const out = synced(
      (message) =>
        message.direction === 'out' &&
        message.createdAt >= since &&
        normalized(message.body) === text
    );
    if (out) used.add(out.id);
    else {
      const id = chatRowId(entry.clientId);
      added.push(chatRow(id, { direction: 'out', body: entry.text, leg, createdAt: entry.sentAt }));
      if (entry.status === 'sending' || entry.status === 'failed')
        marks.set(id, { clientId: entry.clientId, status: entry.status, error: entry.error });
    }
    if (entry.status === 'waiting') typing = true;
    const reply = normalized(entry.reply);
    if (reply.length === 0) continue;
    const answer = synced(
      (message) =>
        message.direction === 'in' &&
        message.createdAt >= since &&
        (normalized(message.body) === reply ||
          (out !== undefined && message.createdAt >= out.createdAt))
    );
    if (answer) {
      used.add(answer.id);
      continue;
    }
    added.push(
      chatRow(chatReplyRowId(entry.clientId), {
        direction: 'in',
        body: reply,
        leg: null,
        createdAt: entry.sentAt + 1,
      })
    );
  }

  if (added.length === 0) return { rows: messages, marks, typing };
  const rows = [...messages, ...added]
    .map((message, index) => ({ message, index }))
    .sort((a, b) => a.message.createdAt - b.message.createdAt || a.index - b.index)
    .map(({ message }) => message);
  return { rows, marks, typing };
}
