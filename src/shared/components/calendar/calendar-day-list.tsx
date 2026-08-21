import { LegendList } from '@legendapp/list/react-native';
import { useCallback, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { CalendarEntry } from '@/core/types';
import { Text } from '@/shared/components/ui/text';
import { EmptyState } from '@/shared/components/layout';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { cn } from '@/shared/libs/utils';

type CalendarDayListProps = {
  entries: readonly CalendarEntry[];
  emptyLabel: string;
  formatTime: (entry: CalendarEntry) => string;
  onSelect?: (entry: CalendarEntry) => void;
  renderActions?: (entry: CalendarEntry) => ReactNode;
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
    return <EmptyState icon="calendar" title={emptyLabel} fill={false} />;
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
