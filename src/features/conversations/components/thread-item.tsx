import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { IConversationMessageCacheRow } from '@/core/interfaces';
import type { ArgusResult } from '@/features/voice';
import { DaySeparator } from '@/features/conversations/components/day-separator';
import { MessageBubble } from '@/features/conversations/components/message-bubble';
import { TypingIndicator } from '@/features/conversations/components/typing-indicator';
import type { ChatMark } from '@/features/conversations/model/assistant-chat-overlay';
import { repliedBodyOf } from '@/features/conversations/model/conversation-thread';
import { chatStatusOf, rowStatusOf } from '@/features/conversations/model/receipts';
import type { BubbleStatus } from '@/features/conversations/model/receipts';
import type { ThreadItem } from '@/features/conversations/model/thread-list';
import type { AnchoredResults } from '@/features/conversations/model/thread-results';

export type ThreadDays = { startOfDay: (at: number) => number; dayLabel: (day: number) => string };

export type ThreadChat = {
  typing: boolean;
  marks: ReadonlyMap<string, ChatMark>;
  typed: ReadonlySet<string>;
  onRetry?: (clientId: string) => void;
  onDismiss?: (clientId: string) => void;
};

export type ThreadArgus = {
  results: AnchoredResults;
  renderResult: (result: ArgusResult) => ReactNode;
  askId: string | null;
  renderAsk: () => ReactNode;
};

export type ThreadItemViewProps = {
  item: ThreadItem;
  bodies: ReadonlyMap<string, string>;
  days: ThreadDays;
  chat: ThreadChat;
  argus: ThreadArgus | null;
};

function statusOf(message: IConversationMessageCacheRow, chat: ThreadChat): BubbleStatus | null {
  const mark = chat.marks.get(message.id);
  if (!mark) return rowStatusOf(message);
  return chatStatusOf({ status: mark.status, typed: chat.typed.has(mark.clientId) });
}

export function ThreadItemView({ item, bodies, days, chat, argus }: ThreadItemViewProps) {
  if (item.type === 'day') return <DaySeparator label={days.dayLabel(item.day)} />;
  if (item.type === 'typing') return <TypingIndicator />;
  if (item.type === 'result')
    return <View className="pt-2">{argus?.renderResult(item.result)}</View>;
  const { message } = item;
  return (
    <MessageBubble
      message={message}
      repliedBody={repliedBodyOf(message, bodies)}
      status={statusOf(message, chat)}
      mark={chat.marks.get(message.id)}
      groupStart={item.groupStart}
      ask={argus && argus.askId === message.id ? argus.renderAsk() : null}
      onRetry={chat.onRetry}
      onDismiss={chat.onDismiss}
    />
  );
}
