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

type CalendarDayListProps = {
  entries: readonly CalendarEntry[];
  emptyLabel: string;
  onSelect?: (entry: CalendarEntry) => void;
  onLongPress?: (entry: CalendarEntry) => void;
  renderActions?: (entry: CalendarEntry) => ReactNode;
  renderContextMenu?: (entry: CalendarEntry, trigger: ReactElement) => ReactNode;
  /** Turns the empty panel into the way to add something to this day. */
  onCreate?: () => void;
  addLabel?: string;
};

/**
 * The selected day, under the month grid. Two scales on one screen is what
 * makes a calendar usable: the month answers "when", this answers "what".
 */
export function CalendarDayList({
  entries,
  emptyLabel,
  onSelect,
  onLongPress,
  renderActions,
  renderContextMenu,
  onCreate,
  addLabel,
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
                'text-[15px] font-medium',
                item.status === 'complete'
                  ? 'text-muted-foreground line-through'
                  : 'text-foreground'
              )}
              numberOfLines={1}>
              {item.title}
            </Text>
            {item.location ? (
              <Text className="text-muted-foreground mt-0.5 text-[12px]" numberOfLines={1}>
                {item.location}
              </Text>
            ) : null}
          </View>
          <Text className="text-muted-foreground text-[12px] font-medium">{formatTime(item)}</Text>
        </Pressable>
      );

      return (
        <View className="flex-row items-center gap-3 py-2.5">
          {renderContextMenu ? renderContextMenu(item, pressable) : pressable}
          {renderActions?.(item)}
        </View>
      );
    },
    [formatTime, onLongPress, onSelect, renderActions, renderContextMenu]
  );

  if (entries.length === 0) {
    // A dashed panel that fills the column: the day keeps its place on the
    // screen, and tapping it is how something gets planned there.
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={addLabel ?? emptyLabel}
        disabled={!onCreate}
        onPress={onCreate}
        className="border-border min-h-[120px] flex-1 items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-6 active:opacity-70">
        <Icon name="calendar" className="text-muted-foreground size-5" />
        <Text className="text-muted-foreground text-center text-[13px]">{emptyLabel}</Text>
        {onCreate && addLabel ? (
          <Text className="text-foreground text-[13px] font-medium">{addLabel}</Text>
        ) : null}
      </Pressable>
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
