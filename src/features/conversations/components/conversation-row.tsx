import { clsx } from 'clsx';
import { View } from 'react-native';
import type { IConversationSummaryCacheRow } from '@/core/interfaces';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Chip } from '@/shared/ui/chip';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import { UNREAD_BADGE_MAX } from '@/features/conversations/constants/conversation.constant';
import {
  counterpartNameOf,
  DELIVERY_STATE_KEYS,
  isArgus,
  previewOf,
} from '@/features/conversations/model/conversation-labels';
import { deliveryStateOf } from '@/features/conversations/model/conversation-thread';

export type ConversationRowProps = {
  summary: IConversationSummaryCacheRow;
  now: number;
  selected: boolean;
  onOpen: (counterpartId: number) => void;
};

export function ConversationRow({ summary, now, selected, onOpen }: ConversationRowProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const argus = isArgus(summary.counterpartId);
  const name = counterpartNameOf(summary.counterpartId, summary.counterpartName, t);
  const preview = previewOf(summary.last, t);
  const state = summary.lastSent ? deliveryStateOf(summary.lastSent) : null;
  const at = new Date(summary.last.createdAt);
  const time = date.sameDay(at, new Date(now)) ? date.formatTime(at) : date.formatDayMonth(at);
  const unread = summary.unread > 0;
  const badge = summary.unread > UNREAD_BADGE_MAX ? `${UNREAD_BADGE_MAX}+` : String(summary.unread);
  const label = [
    name,
    preview,
    time,
    unread ? t('screens.conversations.unread', { count: summary.unread }) : null,
    state ? t(DELIVERY_STATE_KEYS[state]) : null,
  ]
    .filter((part): part is string => part !== null)
    .join('. ');
  return (
    <PressableSurface
      a11y={{ label, role: 'button', selected }}
      onPress={() => onOpen(summary.counterpartId)}
      pressed={{ scale: 'surface', fill: true }}
      className={clsx('rounded-well min-h-row flex-row items-center gap-3 px-2 py-2', selected && 'bg-fill')}>
      {argus ? (
        <Avatar presence="idle" round />
      ) : (
        <Avatar initial={name.charAt(0).toLocaleUpperCase()} round />
      )}
      <View className="min-w-0 flex-1">
        <Text variant="rowTitle" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="rowMeta" tone="2" numberOfLines={1}>
          {state ? t('screens.conversations.preview-state', { preview, state: t(DELIVERY_STATE_KEYS[state]) }) : preview}
        </Text>
      </View>
      <View className="items-end gap-1">
        <Text variant="caption" tone={unread ? 'default' : '3'}>
          {time}
        </Text>
        {unread ? <Chip label={badge} tone="attn" /> : null}
      </View>
    </PressableSurface>
  );
}
