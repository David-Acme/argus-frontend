import type { ReactElement, ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { AgendaStatus } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { itemIn } from '@/shared/libs/animations';
import { cn } from '@/shared/libs/utils';
import { MemberStack } from './member-stack';

type AgendaItemProps = {
  title: string;
  /** Already formatted: a single time or a range. */
  time: string;
  /** Display names; the card renders initials only. */
  members?: readonly string[];
  /** Expanded detail, as on the schedule screen. */
  note?: string;
  status: AgendaStatus;
  onPress?: () => void;
  /** Opens the entry action sheet on a phone without competing with tap. */
  onLongPress?: () => void;
  /** Row menu; without it the corner stays a plain affordance-free marker. */
  actions?: ReactNode;
  /** Wraps the press surface when a platform-specific context menu is available. */
  contextMenu?: (trigger: ReactElement) => ReactNode;
};

const RAIL_CLASS: Record<AgendaStatus, string> = {
  upcoming: 'bg-interactive',
  active: 'bg-accent',
  complete: 'bg-success',
};

export function AgendaItem({
  title,
  time,
  members,
  note,
  status,
  onPress,
  onLongPress,
  actions,
  contextMenu,
}: AgendaItemProps) {
  const { t } = useTranslation();
  const statusLabel = {
    upcoming: t('screens.home.status-upcoming'),
    active: t('screens.home.status-active'),
    complete: t('screens.home.status-complete'),
  }[status];

  const pressable = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${statusLabel}, ${time}`}
      className="min-w-0 flex-1 flex-row active:opacity-80"
      onPress={onPress}
      onLongPress={onLongPress}>
      {/* The rail is a card edge, so it lives outside the padding. */}
      <View className={cn('w-[3px]', RAIL_CLASS[status])} />
      <View className="min-w-0 flex-1 gap-1 p-3">
        <View className="flex-row items-start justify-between gap-3">
          <Text className="flex-1 text-[15px] font-semibold leading-5" numberOfLines={1}>
            {title}
          </Text>
        </View>
        {/* Without members the row collapses: an empty avatar slot turns a
            one-line entry into a card with a hole in it. */}
        {members && members.length > 0 ? (
          <>
            <Text className="text-muted-foreground text-[13px]">{statusLabel}</Text>
            <View className="mt-1.5 flex-row items-center justify-between gap-3">
              <MemberStack members={members} />
              <View className="flex-row items-center gap-1.5">
                <Icon name="clock" className="text-muted-foreground size-3.5" />
                <Text className="text-foreground-secondary text-[12px] font-medium">{time}</Text>
              </View>
            </View>
          </>
        ) : (
          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-muted-foreground text-[13px]">{statusLabel}</Text>
            <View className="flex-row items-center gap-1.5">
              <Icon name="clock" className="text-muted-foreground size-3.5" />
              <Text className="text-foreground-secondary text-[12px] font-medium">{time}</Text>
            </View>
          </View>
        )}
        {note ? (
          <View className="bg-surface mt-2.5 rounded-[14px] p-3">
            <Text className="text-foreground-secondary text-[13px] leading-[19px]">{note}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );

  return (
    <Animated.View entering={itemIn.duration(300)}>
      <View className="bg-card flex-row overflow-hidden rounded-[20px] shadow-md shadow-black/[0.06]">
        {contextMenu ? contextMenu(pressable) : pressable}
        {actions ? <View className="pt-3 pr-3">{actions}</View> : null}
      </View>
    </Animated.View>
  );
}
