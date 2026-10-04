import { useMemo, type ReactElement, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import type { CalendarEntry } from '@/core/types';
import { AgendaEntryRow } from '@/features/agenda/components/agenda-entry-row';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type CalendarDayViewProps = {
  day: Date;
  now: number;
  compact: boolean;
  entries: readonly CalendarEntry[];
  onSelect?: (entry: CalendarEntry) => void;
  onLongPress?: (entry: CalendarEntry) => void;
  onCreateAt?: (at: Date) => void;
  renderActions?: (entry: CalendarEntry) => ReactNode;
  renderContextMenu?: (entry: CalendarEntry, trigger: ReactElement) => ReactNode;
};

type EntryListProps = Pick<
  CalendarDayViewProps,
  'compact' | 'onSelect' | 'onLongPress' | 'renderActions' | 'renderContextMenu'
> & { entries: readonly CalendarEntry[] };

const slotHover = Platform.select({ web: 'hover:bg-surface-secondary/60', default: '' });

function EntryList({ entries, compact, onSelect, onLongPress, renderActions, renderContextMenu }: EntryListProps) {
  return (
    <View className="gap-2">
      {entries.map((entry) => (
        <AgendaEntryRow
          key={entry.id}
          entry={entry}
          compact={compact}
          onPress={onSelect ? () => onSelect(entry) : undefined}
          onLongPress={onLongPress ? () => onLongPress(entry) : undefined}
          actions={renderActions?.(entry)}
          contextMenu={renderContextMenu ? (trigger) => renderContextMenu(entry, trigger) : undefined}
        />
      ))}
    </View>
  );
}

export function CalendarDayView({
  day,
  now,
  compact,
  entries,
  onSelect,
  onLongPress,
  onCreateAt,
  renderActions,
  renderContextMenu,
}: CalendarDayViewProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const bottomInset = useBottomNavInset();
  const isToday = date.sameDay(day, new Date(now));
  const currentHour = isToday ? date.hourOf(new Date(now)) : null;
  const allDay = useMemo(() => entries.filter((entry) => entry.isAllDay), [entries]);
  const byHour = useMemo(() => {
    const map = new Map<number, CalendarEntry[]>();
    for (const entry of entries) {
      if (entry.isAllDay) continue;
      const hour = date.hourOf(new Date(entry.startsAt));
      const list = map.get(hour);
      if (list) list.push(entry);
      else map.set(hour, [entry]);
    }
    for (const list of map.values()) list.sort((left, right) => left.startsAt - right.startsAt);
    return map;
  }, [date, entries]);
  const hours = useMemo(
    () => date.timelineHours([...byHour.keys(), ...(currentHour == null ? [] : [currentHour])]),
    [byHour, currentHour, date]
  );
  const listProps = { compact, onSelect, onLongPress, renderActions, renderContextMenu };
  const gutter = compact ? 'w-12' : 'w-16';

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: bottomInset }}
      showsVerticalScrollIndicator={false}>
      {allDay.length > 0 || entries.length === 0 ? (
        <View className="flex-row items-start gap-3 pb-4">
          <View className={cn(gutter, 'pt-2.5')}>
            <Text variant="micro" className="font-semibold tracking-[0.6px] uppercase">
              {t('screens.agenda.event-all-day')}
            </Text>
          </View>
          <View className="min-w-0 flex-1">
            {allDay.length > 0 ? (
              <EntryList entries={allDay} {...listProps} />
            ) : (
              <Text variant="caption" className="py-2.5">
                {isToday ? t('screens.agenda.today-free') : t('screens.agenda.day-empty')}
              </Text>
            )}
          </View>
        </View>
      ) : null}

      <View className="gap-1">
        {hours.map((hour) => {
          const slot = byHour.get(hour);
          const current = hour === currentHour;
          return (
            <View key={hour} className="flex-row items-start gap-3">
              <View className={cn(gutter, 'pt-1')}>
                <View
                  className={cn(
                    'self-start rounded-full px-2 py-0.5',
                    current ? 'bg-accent-soft' : 'bg-transparent'
                  )}>
                  <Text
                    variant="caption"
                    className={cn(
                      'font-medium',
                      current ? 'text-foreground font-semibold' : slot ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                    {date.formatHour(hour)}
                  </Text>
                </View>
              </View>
              <View className="min-w-0 flex-1">
                {slot ? (
                  <View className="pb-2">
                    <EntryList entries={slot} {...listProps} />
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t('screens.agenda.new-event')} · ${date.formatHour(hour)}`}
                    disabled={!onCreateAt}
                    onPress={
                      onCreateAt
                        ? () => onCreateAt(date.atInputTime(day, `${String(hour).padStart(2, '0')}:00`))
                        : undefined
                    }
                    className={cn('group h-8 flex-row items-center gap-2 rounded-lg px-2', slotHover)}>
                    <View className={cn('h-hairline flex-1', current ? 'bg-accent' : 'bg-divider/70')} />
                    {onCreateAt ? (
                      <Icon name="plus" className="text-muted-foreground web:opacity-0 web:group-hover:opacity-100 size-3.5" />
                    ) : null}
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
