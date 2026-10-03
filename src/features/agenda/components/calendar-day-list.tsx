import { LegendList } from '@legendapp/list/react-native';
import { useCallback, type ReactElement, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { CalendarEntry } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { DAY_LIST_ROW_ESTIMATE } from '@/shared/constants';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { isPendingEntry } from '@/features/agenda/model/calendar-optimistic';

type DaySlotProps = {
  label: string;
  hint?: string;
  icon: 'calendar' | 'plus';
  onPress?: () => void;
  grow: boolean;
};

type CalendarDayListProps = {
  entries: readonly CalendarEntry[];
  emptyLabel: string;
  onSelect?: (entry: CalendarEntry) => void;
  onLongPress?: (entry: CalendarEntry) => void;
  renderActions?: (entry: CalendarEntry) => ReactNode;
  renderContextMenu?: (entry: CalendarEntry, trigger: ReactElement) => ReactNode;
  onCreate?: () => void;
  addLabel?: string;
  fillCreate?: boolean;
};

const VIRTUALIZE_FROM = 30;

function DaySlot({ label, hint, icon, onPress, grow }: DaySlotProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      disabled={!onPress}
      onPress={onPress}
      className={cn(
        'border-border web:hover:bg-surface-secondary/60 items-center justify-center gap-2 rounded-2xl border border-dashed px-4 active:opacity-70',
        grow ? 'min-h-[120px] flex-1 py-6' : 'min-h-14 flex-row py-3',
      )}>
      <Icon name={icon} className="text-muted-foreground size-5" />
      <Text variant="caption" className="text-foreground-secondary text-center">
        {label}
      </Text>
      {hint ? (
        <Text variant="caption" className="text-foreground text-center font-medium">
          {hint}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function CalendarDayList({
  entries,
  emptyLabel,
  onSelect,
  onLongPress,
  renderActions,
  renderContextMenu,
  onCreate,
  addLabel,
  fillCreate = false,
}: CalendarDayListProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const bottomInset = useBottomNavInset();
  const formatTime = useCallback(
    (entry: CalendarEntry) =>
      entry.isAllDay
        ? t('screens.agenda.event-all-day')
        : date.formatTimeRange(
            new Date(entry.startsAt),
            entry.endsAt ? new Date(entry.endsAt) : null
          ),
    [date, t]
  );
  const renderItem = useCallback(
    ({ item }: { item: CalendarEntry }) => {
      const pressable = (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.title}
          className="min-w-0 flex-1 flex-row items-center gap-3 active:opacity-70"
          onPress={onSelect ? () => onSelect(item) : undefined}
          onLongPress={onLongPress ? () => onLongPress(item) : undefined}>
          <View
            className={cn(
              'w-[3px] self-stretch rounded-full',
              item.status === 'complete'
                ? 'bg-success'
                : item.source === 'task'
                  ? 'bg-accent'
                  : 'bg-interactive'
            )}
          />
          <View className="min-w-0 flex-1">
            <Text
              className={cn(
                'text-body font-medium',
                item.status === 'complete'
                  ? 'text-muted-foreground line-through'
                  : 'text-foreground'
              )}
              numberOfLines={1}>
              {item.title}
            </Text>
            {item.location ? (
              <Text variant="caption" className="mt-0.5" numberOfLines={1}>
                {item.location}
              </Text>
            ) : null}
          </View>
          <Text variant="micro" className="text-muted-foreground font-medium">{formatTime(item)}</Text>
        </Pressable>
      );

      return (
        <View
          accessibilityState={{ busy: isPendingEntry(item) }}
          className={cn(
            'web:hover:bg-surface-secondary/50 -mx-2 flex-row items-center gap-3 rounded-xl px-2 py-2.5',
            isPendingEntry(item) && 'opacity-60',
          )}>
          {renderContextMenu ? renderContextMenu(item, pressable) : pressable}
          {renderActions?.(item)}
        </View>
      );
    },
    [formatTime, onLongPress, onSelect, renderActions, renderContextMenu]
  );

  if (entries.length === 0) {
    return (
      <DaySlot
        icon="calendar"
        label={emptyLabel}
        hint={onCreate ? addLabel : undefined}
        onPress={onCreate}
        grow
      />
    );
  }

  if (entries.length < VIRTUALIZE_FROM) {
    return (
      <View className="flex-1 gap-1">
        {entries.map((item) => (
          <View key={item.id}>{renderItem({ item })}</View>
        ))}
        {onCreate && addLabel ? <DaySlot icon="plus" label={addLabel} onPress={onCreate} grow={fillCreate} /> : null}
      </View>
    );
  }

  return (
    <LegendList
      data={entries as CalendarEntry[]}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      estimatedItemSize={DAY_LIST_ROW_ESTIMATE}
      contentContainerStyle={{ paddingBottom: bottomInset }}
      recycleItems
      showsVerticalScrollIndicator={false}
    />
  );
}
