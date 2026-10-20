import { Pressable, View } from 'react-native';
import type { IConversationMessageCacheRow } from '@/core/interfaces';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { isPendingRecordId } from '@/shared/libs/optimistic';
import { cn } from '@/shared/libs/utils';
import { LEG_ICONS } from '@/features/conversations/constants';
import { DeliveryState } from '@/features/conversations/components/delivery-state';
import { DELIVERY_STATE_KEYS, LEG_KEYS } from '@/features/conversations/model/conversation-labels';
import { deliveryStateOf, legOf, quoted } from '@/features/conversations/model/conversation-thread';
import type { ChatMark } from '@/features/conversations/model/assistant-chat-overlay';
import { chatErrorMessage } from '@/features/conversations/model/assistant-chat-errors';

type MessageBubbleProps = {
  message: IConversationMessageCacheRow;
  repliedBody: string | null;
  mark?: ChatMark;
  onRetry?: (clientId: string) => void;
  onDismiss?: (clientId: string) => void;
};

export function MessageBubble({ message, repliedBody, mark, onRetry, onDismiss }: MessageBubbleProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const outgoing = message.direction === 'out';
  const leg = legOf(message);
  const state = deliveryStateOf(message);
  const visitor = message.kind === 'visitor';
  const pending = isPendingRecordId(message.id) || mark?.status === 'sending';
  const failure = mark?.status === 'failed' ? chatErrorMessage(mark.error, t) : null;
  const time = date.formatTime(new Date(message.createdAt));
  const label = [
    visitor ? t('screens.conversations.visitor') : null,
    repliedBody !== null ? t('screens.conversations.reply-to', { body: quoted(repliedBody) }) : null,
    message.body,
    time,
    leg ? t(LEG_KEYS[leg]) : null,
    state ? t(DELIVERY_STATE_KEYS[state]) : null,
    mark?.status === 'sending' ? t('screens.conversations.chat.sending') : null,
    failure,
  ]
    .filter((part): part is string => Boolean(part))
    .join('. ');

  return (
    <View
      accessible
      accessibilityLabel={label}
      className={cn(
        'max-w-[85%] gap-1',
        outgoing ? 'items-end self-end' : 'items-start self-start',
        pending && 'opacity-60'
      )}>
      <View
        className={cn(
          'gap-1 rounded-2xl px-3.5 py-2.5',
          outgoing ? 'bg-interactive rounded-br-md' : 'bg-card dark:bg-card-secondary rounded-bl-md shadow-sm shadow-black/[0.06]'
        )}>
        {visitor ? (
          <View className="flex-row items-center gap-1.5">
            <Icon name="door-open" className="text-foreground-secondary size-3.5" />
            <Text variant="micro" className="text-foreground-secondary font-semibold">
              {t('screens.conversations.visitor')}
            </Text>
          </View>
        ) : null}
        {repliedBody !== null ? (
          <Text
            variant="micro"
            numberOfLines={1}
            className={outgoing ? 'text-foreground-on-interactive opacity-80' : 'text-muted-foreground'}>
            {t('screens.conversations.reply-to', { body: quoted(repliedBody) })}
          </Text>
        ) : null}
        <Text variant="body" className={outgoing ? 'text-foreground-on-interactive' : 'text-foreground'}>
          {message.body}
        </Text>
      </View>
      <View className="flex-row items-center gap-2 px-1">
        <Text variant="micro" className="text-muted-foreground">
          {time}
        </Text>
        {leg ? (
          <View className="flex-row items-center gap-1">
            <Icon name={LEG_ICONS[leg]} className="text-muted-foreground size-3" />
            <Text variant="micro" className="text-muted-foreground">
              {t(LEG_KEYS[leg])}
            </Text>
          </View>
        ) : null}
        {state ? <DeliveryState state={state} /> : null}
      </View>
      {failure !== null && mark ? (
        <View className="items-end gap-1 px-1">
          <View className="flex-row items-center gap-1.5">
            <Icon name="triangle-alert" className="text-error-strong size-3.5" />
            <Text variant="caption" accessibilityLiveRegion="polite" className="text-error-strong">
              {failure}
            </Text>
          </View>
          <View className="flex-row gap-3">
            {onDismiss ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('screens.conversations.chat.dismiss-label', { body: quoted(message.body) })}
                onPress={() => onDismiss(mark.clientId)}
                hitSlop={8}
                className="min-h-8 justify-center active:opacity-70">
                <Text variant="label" className="text-foreground-secondary">
                  {t('screens.conversations.chat.dismiss')}
                </Text>
              </Pressable>
            ) : null}
            {onRetry ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('screens.conversations.chat.retry-label', { body: quoted(message.body) })}
                onPress={() => onRetry(mark.clientId)}
                hitSlop={8}
                className="min-h-8 flex-row items-center gap-1 active:opacity-70">
                <Icon name="rotate-ccw" className="text-foreground size-3.5" />
                <Text variant="label" className="text-foreground">
                  {t('screens.conversations.chat.retry')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}
