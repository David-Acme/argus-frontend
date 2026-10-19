import { View } from 'react-native';
import type { IConversationSummaryCacheRow } from '@/core/interfaces';
import { ListRow } from '@/shared/components/ui/list-row';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { ARGUS_ICON, MEMBER_ICON, UNREAD_BADGE_MAX } from '@/features/conversations/constants';
import { DeliveryState } from '@/features/conversations/components/delivery-state';
import { counterpartNameOf, DELIVERY_STATE_KEYS, isArgus, previewOf } from '@/features/conversations/model/conversation-labels';
import { deliveryStateOf } from '@/features/conversations/model/conversation-thread';

type ConversationRowProps = {
  summary: IConversationSummaryCacheRow;
  now: number;
  onOpen: (counterpartId: number) => void;
};

export function ConversationRow({ summary, now, onOpen }: ConversationRowProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const name = counterpartNameOf(summary.counterpartId, summary.counterpartName, t);
  const preview = previewOf(summary.last, t);
  const state = summary.lastSent ? deliveryStateOf(summary.lastSent) : null;
  const at = new Date(summary.last.createdAt);
  const time = date.sameDay(at, new Date(now)) ? date.formatTime(at) : date.formatDayMonth(at);
  const unread = summary.unread > 0;
  const badge = summary.unread > UNREAD_BADGE_MAX ? `${UNREAD_BADGE_MAX}+` : String(summary.unread);
  const footerLabel = [
    time,
    unread ? t('screens.conversations.unread', { count: summary.unread }) : null,
    state ? t(DELIVERY_STATE_KEYS[state]) : null,
  ]
    .filter((part): part is string => part !== null)
    .join('. ');

  return (
    <ListRow
      title={name}
      subtitle={preview}
      icon={isArgus(summary.counterpartId) ? ARGUS_ICON : MEMBER_ICON}
      footer={state ? <DeliveryState state={state} /> : undefined}
      footerLabel={footerLabel}
      onPress={() => onOpen(summary.counterpartId)}
      trailing={
        <View className="items-end gap-1 self-start pt-0.5">
          <Text variant="micro" className={unread ? 'text-foreground font-semibold' : 'text-muted-foreground'}>
            {time}
          </Text>
          {unread ? (
            <View className="bg-interactive min-w-5 items-center rounded-full px-1.5 py-0.5">
              <Text variant="micro" className="text-foreground-on-interactive font-semibold">
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
      }
    />
  );
}
