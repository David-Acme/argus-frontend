import type { IConversationMessageCacheRow } from '@/core/interfaces';
import type { AssistantChatEntry, AssistantChatEntryStatus, ConversationLeg } from '@/core/types';

export type ChatMark = {
  clientId: string;
  status: AssistantChatEntryStatus;
  error: string | null;
};

export type ChatOverlay = {
  rows: readonly IConversationMessageCacheRow[];
  marks: ReadonlyMap<string, ChatMark>;
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
  receipt: null,
  voiceNote: null,
  isRead: true,
  ...facts,
});

export const chatRowId = (clientId: string): string => `chat:${clientId}`;

export const chatReplyRowId = (clientId: string): string => `chat:${clientId}:reply`;

export function chatOverlay({ messages, entries, leg, skewMs }: ChatOverlayInput): ChatOverlay {
  if (entries.length === 0) return { rows: messages, marks: new Map() };
  const used = new Set<string>();
  const added: IConversationMessageCacheRow[] = [];
  const marks = new Map<string, ChatMark>();

  const synced = (match: (message: IConversationMessageCacheRow) => boolean) =>
    messages.find((message) => !used.has(message.id) && message.kind === 'turn' && match(message));

  const markOf = (entry: AssistantChatEntry): ChatMark => ({
    clientId: entry.clientId,
    status: entry.status,
    error: entry.error,
  });

  for (const entry of entries) {
    const since = entry.sentAt - skewMs;
    const text = normalized(entry.text);
    const note = entry.noteId ?? null;
    const out = synced((message) =>
      note !== null
        ? message.direction === 'out' && message.voiceNote?.id === note
        : message.direction === 'out' &&
          message.createdAt >= since &&
          normalized(message.body) === text
    );
    if (out) {
      used.add(out.id);
      if (note !== null && entry.status !== 'done') marks.set(out.id, markOf(entry));
    } else if (note === null) {
      const id = chatRowId(entry.clientId);
      added.push(chatRow(id, { direction: 'out', body: entry.text, leg, createdAt: entry.sentAt }));
      marks.set(id, markOf(entry));
    }
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

  if (added.length === 0) return { rows: messages, marks };
  const rows = [...messages, ...added]
    .map((message, index) => ({ message, index }))
    .sort((a, b) => a.message.createdAt - b.message.createdAt || a.index - b.index)
    .map(({ message }) => message);
  return { rows, marks };
}
