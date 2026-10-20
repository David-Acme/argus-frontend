import { View } from 'react-native';
import type { IConversationMessageCacheRow } from '@/core/interfaces';
import { Text } from '@/shared/components/ui/text';
import { MessageBubble } from '@/features/conversations/components/message-bubble';
import { repliedBodyOf } from '@/features/conversations/model/conversation-thread';
import type { ChatMark } from '@/features/conversations/model/assistant-chat-overlay';

type ConversationDayProps = {
  label: string;
  messages: readonly IConversationMessageCacheRow[];
  bodies: ReadonlyMap<string, string>;
  marks?: ReadonlyMap<string, ChatMark>;
  onRetry?: (clientId: string) => void;
  onDismiss?: (clientId: string) => void;
};

export function ConversationDay({ label, messages, bodies, marks, onRetry, onDismiss }: ConversationDayProps) {
  return (
    <View className="gap-3">
      <View accessibilityRole="header" className="bg-surface-secondary self-center rounded-full px-3 py-1">
        <Text variant="micro" className="text-foreground-secondary">
          {label}
        </Text>
      </View>
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          repliedBody={repliedBodyOf(message, bodies)}
          mark={marks?.get(message.id)}
          onRetry={onRetry}
          onDismiss={onDismiss}
        />
      ))}
    </View>
  );
}
