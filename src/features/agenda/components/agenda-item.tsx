import type { ReactElement, ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { CalendarEntryState } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { ENTRY_STATE_RAIL, entryStateLabelKey } from '@/features/agenda/model/entry-state';

type AgendaItemProps = {
  title: string;
  time: string;
  note?: string;
  state: CalendarEntryState;
  onPress?: () => void;
  onLongPress?: () => void;
  actions?: ReactNode;
  contextMenu?: (trigger: ReactElement) => ReactNode;
  pending?: boolean;
};

export function AgendaItem({
  title,
  time,
  note,
  state,
  onPress,
  onLongPress,
  actions,
  contextMenu,
  pending = false,
}: AgendaItemProps) {
  const { t } = useTranslation();
  const statusLabel = t(entryStateLabelKey(state));

  const pressable = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${statusLabel}, ${time}`}
      className="web:hover:bg-surface-secondary/40 min-w-0 flex-1 flex-row active:opacity-80"
      disabled={pending}
      onPress={onPress}
      onLongPress={onLongPress}>
      <View className={cn('w-[3px]', ENTRY_STATE_RAIL[state])} />
      <View className="min-w-0 flex-1 gap-1 p-3">
        <View className="flex-row items-start justify-between gap-3">
          <Text className="flex-1 text-body font-semibold leading-5" numberOfLines={1}>
            {title}
          </Text>
        </View>
        <View className="flex-row items-center justify-between gap-3">
          <Text variant="caption">{statusLabel}</Text>
          <View className="flex-row items-center gap-1.5">
            <Icon name="clock" className="text-muted-foreground size-3.5" />
            <Text variant="micro" className="text-foreground-secondary font-medium">{time}</Text>
          </View>
        </View>
        {note ? (
          <View className="bg-surface mt-2.5 rounded-[14px] p-3">
            <Text className="text-foreground-secondary text-caption leading-[19px]">{note}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );

  return (
    <View
      accessibilityState={{ busy: pending }}
      className={cn(
        'bg-card dark:bg-card-secondary flex-row overflow-hidden rounded-[20px] shadow-md shadow-black/[0.06]',
        pending && 'opacity-60',
      )}>
      {contextMenu ? contextMenu(pressable) : pressable}
      {actions === undefined ? null : <View className="w-7 items-start pt-3">{actions}</View>}
    </View>
  );
}
