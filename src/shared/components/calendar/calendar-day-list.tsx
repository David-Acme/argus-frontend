import { LegendList } from '@legendapp/list/react-native';
import { useCallback, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { CalendarEntry } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { cn } from '@/shared/libs/utils';

type CalendarDayListProps = {
  entries: readonly CalendarEntry[];
  emptyLabel: string;
  formatTime: (entry: CalendarEntry) => string;
  onSelect?: (entry: CalendarEntry) => void;
  renderActions?: (entry: CalendarEntry) => ReactNode;
  /** Turns the empty panel into the way to add something to this day. */
  onCreate?: () => void;
  addLabel?: string;
};

/** Row height used as the size hint; rows are single-line by design. */
const ROW_SIZE = 56;

/**
 * The selected day, under the month grid. Two scales on one screen is what
 * makes a calendar usable: the month answers "when", this answers "what".
 */
export function CalendarDayList({
  entries,
  emptyLabel,
  formatTime,
  onSelect,
  renderActions,
  onCreate,
  addLabel,
}: CalendarDayListProps) {
  const bottomInset = useBottomNavInset();
  const renderItem = useCallback(
    ({ item }: { item: CalendarEntry }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.title}
        className="flex-row items-center gap-3 py-2.5 active:opacity-70"
        onPress={onSelect ? () => onSelect(item) : undefined}>
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
        <View className="flex-1">
          <Text
            className={cn(
              'text-[15px] font-medium',
              item.status === 'complete' ? 'text-muted-foreground line-through' : 'text-foreground'
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
        {renderActions?.(item)}
      </Pressable>
    ),
    [formatTime, onSelect, renderActions]
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
      estimatedItemSize={ROW_SIZE}
      contentContainerStyle={{ paddingBottom: bottomInset }}
      recycleItems
      showsVerticalScrollIndicator={false}
    />
  );
}
