import { LegendList } from '@legendapp/list/react-native';
import { useCallback, useMemo, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { CalendarEntry } from '@/core/types';
import { AgendaItem } from '@/shared/components/dashboard';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { addDays, startOfDay } from '@/shared/libs/calendar';

type CalendarAgendaViewProps = {
  entries: readonly CalendarEntry[];
  /** Window the list walks day by day, so the schedule reads as a continuum. */
  from: number;
  to: number;
  freeLabel: string;
  /** Formats a day heading, e.g. "Thursday, 20 August". */
  formatDay: (date: Date) => string;
  formatTime: (entry: CalendarEntry) => string;
  onSelect?: (entry: CalendarEntry) => void;
  onCreateDay?: (day: Date) => void;
  renderActions?: (entry: CalendarEntry) => ReactNode;
};

/** A day heading, an entry, or a free day: one flat list, never nested. */
type AgendaRow =
  | { kind: 'header'; key: string; day: number }
  | { kind: 'entry'; key: string; entry: CalendarEntry }
  | { kind: 'free'; key: string; day: number };

const ENTRY_SIZE = 92;

export function CalendarAgendaView({
  entries,
  from,
  to,
  freeLabel,
  formatDay,
  formatTime,
  onSelect,
  onCreateDay,
  renderActions,
}: CalendarAgendaViewProps) {
  const bottomInset = useBottomNavInset();
  const { rows, headerIndices } = useMemo(() => {
    const grouped = new Map<number, CalendarEntry[]>();
    for (const entry of entries) {
      const key = startOfDay(new Date(entry.startsAt)).getTime();
      const list = grouped.get(key);
      if (list) list.push(entry);
      else grouped.set(key, [entry]);
    }

    const flat: AgendaRow[] = [];
    for (let day = startOfDay(new Date(from)); day.getTime() <= to; day = addDays(day, 1)) {
      const key = day.getTime();
      flat.push({ kind: 'header', key: `h:${key}`, day: key });
      const dayEntries = grouped.get(key);
      if (dayEntries) {
        for (const entry of dayEntries) flat.push({ kind: 'entry', key: entry.id, entry });
      } else {
        flat.push({ kind: 'free', key: `f:${key}`, day: key });
      }
    }
    const headers: number[] = [];
    flat.forEach((row, index) => {
      if (row.kind === 'header') headers.push(index);
    });
    return { rows: flat, headerIndices: headers };
  }, [entries, from, to]);

  const renderItem = useCallback(
    ({ item }: { item: AgendaRow }) => {
      if (item.kind === 'header') {
        return (
          // Sticky, so the day you are looking at stays named while you scroll.
          <View className="bg-background pb-2 pt-4">
            <Text className="text-foreground-secondary text-[13px] font-semibold capitalize">
              {formatDay(new Date(item.day))}
            </Text>
          </View>
        );
      }
      if (item.kind === 'free') {
        return (
          <Pressable
            accessibilityRole="button"
            disabled={!onCreateDay}
            onPress={onCreateDay ? () => onCreateDay(new Date(item.day)) : undefined}
            className="border-border mb-2.5 flex-row items-center justify-between rounded-2xl border border-dashed px-4 py-3 active:opacity-70">
            <Text className="text-muted-foreground text-[13px]">{freeLabel}</Text>
            {onCreateDay ? <Icon name="plus" className="text-muted-foreground size-4" /> : null}
          </Pressable>
        );
      }
      return (
        <View className="pb-2.5">
          <AgendaItem
            title={item.entry.title}
            time={formatTime(item.entry)}
            status={item.entry.status}
            onPress={onSelect ? () => onSelect(item.entry) : undefined}
            actions={renderActions?.(item.entry)}
          />
        </View>
      );
    },
    [formatDay, formatTime, freeLabel, onCreateDay, onSelect, renderActions]
  );

  return (
    <LegendList
      data={rows}
      renderItem={renderItem}
      keyExtractor={(item) => item.key}
      // One hint for the common row (an entry); Legend List measures the rest,
      // so mixed heights need no per-row callback.
      estimatedItemSize={ENTRY_SIZE}
      stickyHeaderIndices={headerIndices}
      contentContainerStyle={{ paddingBottom: bottomInset }}
      recycleItems
      showsVerticalScrollIndicator={false}
    />
  );
}
