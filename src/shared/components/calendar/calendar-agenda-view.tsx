import { LegendList } from '@legendapp/list/react-native';
import { useCallback, useMemo, type ReactElement, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { CalendarEntry } from '@/core/types';
import { AgendaItem } from '@/shared/components/dashboard';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import {
  AGENDA_ENTRY_ESTIMATE,
  AGENDA_FIXED_ROW_SIZES,
} from '@/shared/constants';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';

type CalendarAgendaViewProps = {
  entries: readonly CalendarEntry[];
  /** Window the list walks day by day, so the schedule reads as a continuum. */
  from: number;
  to: number;
  freeLabel: string;
  onSelect?: (entry: CalendarEntry) => void;
  onLongPress?: (entry: CalendarEntry) => void;
  onCreateDay?: (day: Date) => void;
  renderActions?: (entry: CalendarEntry) => ReactNode;
  renderContextMenu?: (entry: CalendarEntry, trigger: ReactElement) => ReactNode;
};

/** A day heading, an entry, or a free day: one flat list, never nested. */
type AgendaRow =
  | { kind: 'header'; key: string; day: number }
  | { kind: 'entry'; key: string; entry: CalendarEntry }
  | { kind: 'free'; key: string; day: number };

export function CalendarAgendaView({
  entries,
  from,
  to,
  freeLabel,
  onSelect,
  onLongPress,
  onCreateDay,
  renderActions,
  renderContextMenu,
}: CalendarAgendaViewProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const bottomInset = useBottomNavInset();
  const { rows, headerIndices } = useMemo(() => {
    const grouped = new Map<number, CalendarEntry[]>();
    for (const entry of entries) {
      const key = date.startOfDay(new Date(entry.startsAt)).getTime();
      const list = grouped.get(key);
      if (list) list.push(entry);
      else grouped.set(key, [entry]);
    }

    const flat: AgendaRow[] = [];
    for (
      let day = date.startOfDay(new Date(from));
      day.getTime() <= to;
      day = date.addDays(day, 1)
    ) {
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
  }, [date, entries, from, to]);

  const renderItem = useCallback(
    ({ item }: { item: AgendaRow }) => {
      if (item.kind === 'header') {
        return (
          // Sticky, so the day you are looking at stays named while you scroll.
          <View className="bg-background pt-4 pb-2">
            <Text className="text-foreground-secondary text-[13px] font-semibold capitalize">
              {date.formatAgendaDay(new Date(item.day))}
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
            time={
              item.entry.isAllDay
                ? t('screens.agenda.event-all-day')
                : date.formatTimeRange(
                    new Date(item.entry.startsAt),
                    item.entry.endsAt ? new Date(item.entry.endsAt) : null
                  )
            }
            status={item.entry.status}
            onPress={onSelect ? () => onSelect(item.entry) : undefined}
            onLongPress={onLongPress ? () => onLongPress(item.entry) : undefined}
            actions={renderActions?.(item.entry)}
            contextMenu={
              renderContextMenu
                ? (trigger) => renderContextMenu(item.entry, trigger)
                : undefined
            }
          />
        </View>
      );
    },
    [date, freeLabel, onCreateDay, onLongPress, onSelect, renderActions, renderContextMenu, t]
  );

  return (
    <LegendList
      data={rows}
      renderItem={renderItem}
      keyExtractor={(item) => item.key}
      // One hint for the common row (an entry); headers/free are exact, and
      // entries get measured on mount.
      estimatedItemSize={AGENDA_ENTRY_ESTIMATE}
      getItemType={(item) => item.kind}
      getFixedItemSize={(_item, _index, kind) =>
        kind ? AGENDA_FIXED_ROW_SIZES[kind] : undefined
      }
      stickyHeaderIndices={headerIndices}
      contentContainerStyle={{ paddingBottom: bottomInset }}
      recycleItems
      showsVerticalScrollIndicator={false}
    />
  );
}
