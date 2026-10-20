import { View } from 'react-native';
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

type MessageBubbleProps = {
  message: IConversationMessageCacheRow;
  repliedBody: string | null;
};

export function MessageBubble({ message, repliedBody }: MessageBubbleProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const outgoing = message.direction === 'out';
  const leg = legOf(message);
  const state = deliveryStateOf(message);
  const visitor = message.kind === 'visitor';
  const pending = isPendingRecordId(message.id);
  const time = date.formatTime(new Date(message.createdAt));
  const label = [
    visitor ? t('screens.conversations.visitor') : null,
    repliedBody !== null ? t('screens.conversations.reply-to', { body: quoted(repliedBody) }) : null,
    message.body,
    time,
    leg ? t(LEG_KEYS[leg]) : null,
    state ? t(DELIVERY_STATE_KEYS[state]) : null,
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
    </View>
  );
}
